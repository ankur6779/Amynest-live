import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Volume2, Pause, Play, SkipBack, SkipForward, Headphones, Sparkles, Gauge, X, Clock, Loader2, Lock, ListMusic, ChevronDown, ChevronUp, Check } from "lucide-react";
import {
  lessonsForAge,
  getLessonText,
  getAgeLabel,
  getLessonById,
  getRecommendedLessonsForCoachGoal,
  COACH_AUDIO_GOAL_STORAGE_KEY,
  seriesForAge,
  resolveSeriesLessons,
  totalSeriesMinutes,
  LESSONS_COMPLETE_STORAGE_KEY,
  parseCompletedLessonIds,
  serializeCompletedLessonIds,
  markLessonComplete,
  getSeriesProgress,
  firstIncompleteLessonId,
  partIndexForLesson,
  type AgeBucket,
  type Lesson,
  type LessonTier,
  type LessonSeries,
} from "@/lib/audio-lessons";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { usePaywall } from "@/contexts/paywall-context";
import { useSubscription } from "@/hooks/use-subscription";
import { useLessonPlayback } from "@/hooks/use-lesson-playback";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";

const VOICE_AMY_EN = "QbQKfe9vgx5OsbZUvlFv"; // Ananya K — Indian English Female
const MODEL_EN = "eleven_turbo_v2_5";
const AGE_ORDER: AgeBucket[] = ["0-2", "2-4", "5-7", "8-10", "10+"];
const RESUME_KEY = "amynest_audio_resume_v1";
const PREGENERATE_SESSION_KEY = "amynest_audio_pregenerate_v1";

function shouldSkipPregenerate(age: AgeBucket, lang: string): boolean {
  try {
    const raw = sessionStorage.getItem(PREGENERATE_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { age?: string; lang?: string };
    return parsed.age === age && parsed.lang === lang;
  } catch {
    return false;
  }
}

function markPregenerateDone(age: AgeBucket, lang: string): void {
  try {
    sessionStorage.setItem(PREGENERATE_SESSION_KEY, JSON.stringify({ age, lang }));
  } catch {
    /* quota / private mode */
  }
}
type ResumeMap = Record<string, number>;
const loadResume = (): ResumeMap => {
  try {
    return JSON.parse(localStorage.getItem(RESUME_KEY) ?? "{}");
  } catch {
    return {};
  }
};
const saveResume = (m: ResumeMap) => localStorage.setItem(RESUME_KEY, JSON.stringify(m));
export default function AudioLessonsPage() {
  const [, setLocation] = useLocation();
  const [age, setAge] = useState<AgeBucket>("2-4");
  const [open, setOpen] = useState<Lesson | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);
  const [activeSeries, setActiveSeries] = useState<LessonSeries | null>(null);
  const [playerAutoPlay, setPlayerAutoPlay] = useState(false);
  const { t } = useTranslation();
  const lang = "en";
  const authFetch = useAuthFetch();
  const {
    openPaywall
  } = usePaywall();
  const sub = useSubscription();
  const lessons = lessonsForAge(age);
  const ageSeries = useMemo(() => seriesForAge(age), [age]);

  useEffect(() => {
    try {
      setCompletedIds(parseCompletedLessonIds(localStorage.getItem(LESSONS_COMPLETE_STORAGE_KEY)));
    } catch {
      setCompletedIds(new Set());
    }
  }, []);

  const persistCompleted = useCallback((ids: Set<string>) => {
    setCompletedIds(ids);
    try {
      localStorage.setItem(LESSONS_COMPLETE_STORAGE_KEY, serializeCompletedLessonIds(ids));
    } catch {
      /* quota */
    }
  }, []);

  const coachGoalId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const fromUrl = new URLSearchParams(window.location.search).get("goal")?.trim() ?? "";
    if (fromUrl) return fromUrl;
    try {
      return sessionStorage.getItem(COACH_AUDIO_GOAL_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  }, []);

  const recommendedLessons = useMemo(
    () => (coachGoalId ? getRecommendedLessonsForCoachGoal(coachGoalId, 3) : []),
    [coachGoalId],
  );

  const recommendedIds = useMemo(
    () => new Set(recommendedLessons.map((l) => l.id)),
    [recommendedLessons],
  );

  const otherLessons = useMemo(
    () => lessons.filter((l) => !recommendedIds.has(l.id)),
    [lessons, recommendedIds],
  );

  const tierLabel = (tier: LessonTier) => {
    if (tier === "quick") return t("pages.audio_lessons.tier_quick");
    if (tier === "deep") return t("pages.audio_lessons.tier_deep");
    return t("pages.audio_lessons.tier_standard");
  };

  // Pre-warm the audio cache for paragraphs of the current age group in the
  // user's selected language. Fire-and-forget — this is a background
  // optimisation; failures are silently ignored. Premium-only: free users
  // have limited plays anyway.
  const isPremium = sub.isPremium;
  useEffect(() => {
    if (!isPremium) return;
    if (shouldSkipPregenerate(age, lang)) return;
    const texts = lessonsForAge(age).flatMap(l => getLessonText(l, lang).paragraphs);
    if (texts.length === 0) return;
    markPregenerateDone(age, lang);
    void authFetch(getApiUrl("/api/audio-lessons/pregenerate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        texts
      })
    }).catch(() => {});
  }, [age, isPremium, lang, authFetch]);

  // Per-age-group access: first two lessons are free samples, rest are premium-only.
  type LessonAccess = "free-sample" | "locked" | "open";
  const getLessonAccess = (lesson: Lesson): LessonAccess => {
    if (isPremium) return "open";
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    return idx >= 0 && idx < 2 ? "free-sample" : "locked";
  };

  const openLessonPlayer = useCallback((l: Lesson, opts?: { series?: LessonSeries | null; autoPlay?: boolean }) => {
    setActiveSeries(opts?.series ?? null);
    setPlayerAutoPlay(!!opts?.autoPlay);
    setOpen(l);
  }, []);

  const handlePickLesson = async (
    l: Lesson,
    opts?: { series?: LessonSeries | null; autoPlay?: boolean },
  ) => {
    if (unlocking) return;
    const access = getLessonAccess(l);

    if (access === "free-sample") {
      openLessonPlayer(l, opts);
      return;
    }

    if (access === "locked") {
      openPaywall("audio_lessons");
      return;
    }

    setUnlocking(true);
    try {
      await authFetch(getApiUrl("/api/features/audio_lesson/consume"), {
        method: "POST"
      }).catch(() => {/* fire-and-forget */});
      openLessonPlayer(l, opts);
    } catch {
      openLessonPlayer(l, opts);
    } finally {
      setUnlocking(false);
    }
  };

  const handleStartSeries = (series: LessonSeries) => {
    const nextId = firstIncompleteLessonId(series, completedIds) ?? series.lessonIds[0];
    const lesson = getLessonById(nextId);
    if (!lesson) return;
    void handlePickLesson(lesson, { series, autoPlay: true });
  };

  const handleLessonComplete = useCallback((lessonId: string) => {
    const nextCompleted = markLessonComplete(completedIds, lessonId);
    persistCompleted(nextCompleted);
    if (!activeSeries) return;
    const idx = activeSeries.lessonIds.indexOf(lessonId);
    if (idx < 0) return;
    const nextId = activeSeries.lessonIds[idx + 1];
    if (!nextId) return;
    const nextLesson = getLessonById(nextId);
    if (!nextLesson) return;
    const access = getLessonAccess(nextLesson);
    if (access === "locked") {
      openPaywall("audio_lessons");
      return;
    }
    window.setTimeout(() => {
      if (access === "free-sample") {
        openLessonPlayer(nextLesson, { series: activeSeries, autoPlay: true });
        return;
      }
      void authFetch(getApiUrl("/api/features/audio_lesson/consume"), { method: "POST" }).catch(() => {});
      openLessonPlayer(nextLesson, { series: activeSeries, autoPlay: true });
    }, 1200);
  }, [activeSeries, completedIds, persistCompleted, openLessonPlayer, authFetch, isPremium, lessons]);

  const renderLessonCard = (l: Lesson, highlight?: boolean) => {
    const text = getLessonText(l, lang);
    const access = getLessonAccess(l);
    const isLocked = access === "locked";
    const isFree = access === "free-sample";
    return (
      <button
        key={l.id}
        onClick={() => void handlePickLesson(l)}
        disabled={unlocking}
        style={{
          textAlign: "left",
          background: highlight
            ? "rgba(52,211,153,0.08)"
            : isLocked
              ? "rgba(255,255,255,0.03)"
              : "rgba(255,255,255,0.06)",
          border: highlight
            ? "1px solid rgba(52,211,153,0.45)"
            : isLocked
              ? "1px solid rgba(139,92,246,0.12)"
              : isFree
                ? "1px solid rgba(52,211,153,0.35)"
                : "1px solid rgba(139,92,246,0.25)",
          borderRadius: 16,
          padding: 16,
          cursor: unlocking ? "wait" : "pointer",
          opacity: unlocking ? 0.7 : 1,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          color: "#fff",
          transition: "transform 0.15s, background 0.15s",
          position: "relative",
          width: "100%",
        }}
        onMouseDown={e => { e.currentTarget.style.transform = "scale(0.99)"; }}
        onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {isFree && (
          <div style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "linear-gradient(135deg, hsl(var(--brand-emerald-600)), hsl(var(--brand-emerald-500)))",
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 999,
          }}>
            {t("pages.audio_lessons.free")}
          </div>
        )}
        {isLocked && (
          <div style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.5)",
            color: "hsl(var(--brand-amber-300))",
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <Lock size={9} /> {t("pages.audio_lessons.premium")}
          </div>
        )}
        <div style={{
          fontSize: 30,
          lineHeight: 1,
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isLocked ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.15)",
          borderRadius: 12,
          flexShrink: 0,
        }}>{l.emoji}</div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: isLocked || isFree ? 72 : 0 }}>
          <h3 style={{
            margin: "0 0 4px",
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "Quicksand, sans-serif",
            color: isLocked ? "rgba(255,255,255,0.7)" : "#fff",
          }}>
            {text.title}
          </h3>
          <p style={{
            margin: "0 0 8px",
            color: isLocked ? "rgba(199,192,232,0.6)" : "#c7c0e8",
            fontSize: 13,
            lineHeight: 1.45,
          }}>
            {text.description}
          </p>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: isLocked ? "rgba(169,159,217,0.5)" : "#a99fd9",
          }}>
            <span style={{
              padding: "2px 8px",
              borderRadius: 999,
              background:
                l.tier === "quick"
                  ? "rgba(16,185,129,0.2)"
                  : l.tier === "deep"
                    ? "rgba(251,191,36,0.15)"
                    : "rgba(139,92,246,0.2)",
              fontWeight: 700,
              fontSize: 10,
            }}>
              {tierLabel(l.tier)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Clock size={12} /> {l.durationMin} {t("pages.audio_lessons.min")}
            </span>
          </div>
        </div>
        {!isLocked && <Volume2 size={18} color="hsl(var(--brand-violet-300))" style={{ flexShrink: 0, marginTop: 4 }} />}
      </button>
    );
  };
  return <div style={{
    minHeight: "100dvh",
    background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
    color: "#fff",
    paddingBottom: 80
  }}>
      {/* Top bar */}
      <div style={{
      position: "sticky",
      top: 0,
      zIndex: 20,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "linear-gradient(180deg, rgba(15,12,41,0.95) 0%, rgba(15,12,41,0.7) 100%)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid rgba(139,92,246,0.2)"
    }}>
        <button onClick={() => setLocation("/amy-coach")} style={{
        color: "hsl(var(--brand-violet-300))",
        background: "rgba(167,139,250,0.15)",
        borderRadius: 999,
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        cursor: "pointer"
      }} aria-label={t("pages.audio_lessons.back")}>
          <ArrowLeft size={18} />
        </button>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
          <Headphones size={20} color="hsl(var(--brand-violet-300))" />
          <h1 style={{
          fontFamily: "Quicksand, sans-serif",
          fontSize: 18,
          fontWeight: 800,
          margin: 0
        }}>
            {t("pages.audio_lessons.amy_audio_lessons")}
          </h1>
        </div>
      </div>

      {/* Intro */}
      <div style={{
      padding: "20px 16px 8px",
      maxWidth: 720,
      margin: "0 auto"
    }}>
        <p style={{
        color: "#c7c0e8",
        fontSize: 14,
        lineHeight: 1.55,
        margin: 0
      }}>
          {t("pages.audio_lessons.intro")}
        </p>
        <p style={{
          color: "#a99fd9",
          fontSize: 12,
          margin: "8px 0 0",
        }}>
          {t("pages.audio_lessons.lesson_count", { count: lessons.length })}
        </p>
      </div>

      {/* Age selector */}
      <div style={{
      display: "flex",
      gap: 8,
      overflowX: "auto",
      padding: "12px 16px",
      scrollbarWidth: "none"
    }} className="ws-no-scrollbar">
        {AGE_ORDER.map(a => {
        const active = a === age;
        return <button key={a} onClick={() => setAge(a)} style={{
          whiteSpace: "nowrap",
          padding: "9px 14px",
          borderRadius: 999,
          border: "1px solid " + (active ? "transparent" : "rgba(139,92,246,0.3)"),
          background: active ? "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))" : "rgba(255,255,255,0.06)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          boxShadow: active ? "0 4px 12px rgba(139,92,246,0.4)" : "none"
        }}>
              {getAgeLabel(a, lang)}
            </button>;
      })}
      </div>

      {/* Series / playlists */}
      {ageSeries.length > 0 && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "4px 16px 0" }}>
          <h2 style={{
            fontFamily: "Quicksand, sans-serif",
            fontSize: 14,
            fontWeight: 800,
            margin: "0 0 4px",
            color: "#c7c0e8",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <ListMusic size={16} color="hsl(var(--brand-violet-300))" />
            {t("pages.audio_lessons.series_title")}
          </h2>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#a99fd9" }}>
            {t("pages.audio_lessons.series_subtitle")}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {ageSeries.map((series) => {
              const progress = getSeriesProgress(series, completedIds);
              const seriesLessons = resolveSeriesLessons(series);
              const totalMin = totalSeriesMinutes(series);
              const expanded = expandedSeriesId === series.id;
              const nextId = firstIncompleteLessonId(series, completedIds);
              const ctaKey = progress.completed > 0 && nextId
                ? "pages.audio_lessons.series_continue"
                : "pages.audio_lessons.series_start";
              return (
                <div
                  key={series.id}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(139,92,246,0.35)",
                    background: "rgba(139,92,246,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSeriesId(expanded ? null : series.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 14,
                      background: "transparent",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(139,92,246,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0,
                      }}>
                        {series.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 800,
                            fontFamily: "Quicksand, sans-serif",
                          }}>
                            {series.title.en}
                          </h3>
                          {expanded ? <ChevronUp size={18} color="#a99fd9" /> : <ChevronDown size={18} color="#a99fd9" />}
                        </div>
                        <p style={{ margin: "4px 0 8px", fontSize: 12, color: "#c7c0e8", lineHeight: 1.4 }}>
                          {series.description.en}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#a99fd9" }}>
                          {t("pages.audio_lessons.series_meta", {
                            parts: series.lessonIds.length,
                            minutes: totalMin,
                          })}
                        </p>
                        <div style={{
                          marginTop: 8,
                          height: 4,
                          borderRadius: 2,
                          background: "rgba(139,92,246,0.2)",
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${progress.percent}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, hsl(var(--brand-emerald-500)), hsl(var(--brand-violet-500)))",
                            transition: "width 0.3s",
                          }} />
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: 10, color: "#7a749b" }}>
                          {t("pages.audio_lessons.series_progress", {
                            done: progress.completed,
                            total: progress.total,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                  {expanded && (
                    <div style={{ padding: "0 14px 12px", display: "grid", gap: 8 }}>
                      {seriesLessons.map((sl, i) => {
                        const done = completedIds.has(sl.id);
                        const access = getLessonAccess(sl);
                        const locked = access === "locked";
                        return (
                          <button
                            key={sl.id}
                            type="button"
                            onClick={() => void handlePickLesson(sl, { series, autoPlay: false })}
                            disabled={unlocking}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: "1px solid rgba(139,92,246,0.2)",
                              background: "rgba(255,255,255,0.04)",
                              color: "#fff",
                              cursor: unlocking ? "wait" : "pointer",
                              opacity: locked ? 0.65 : 1,
                              textAlign: "left",
                            }}
                          >
                            <span style={{
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              background: done ? "hsl(var(--brand-emerald-500))" : "rgba(139,92,246,0.25)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}>
                              {done ? <Check size={12} /> : i + 1}
                            </span>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                              {getLessonText(sl, lang).title}
                            </span>
                            {locked && <Lock size={12} color="hsl(var(--brand-amber-300))" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ padding: "0 14px 14px" }}>
                    <button
                      type="button"
                      onClick={() => handleStartSeries(series)}
                      disabled={unlocking || progress.percent === 100}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 999,
                        border: "none",
                        background: progress.percent === 100
                          ? "rgba(255,255,255,0.08)"
                          : "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: progress.percent === 100 ? "default" : "pointer",
                        opacity: progress.percent === 100 ? 0.6 : 1,
                      }}
                    >
                      {progress.percent === 100
                        ? t("pages.audio_lessons.series_complete")
                        : t(ctaKey)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended (Amy Coach) */}
      {recommendedLessons.length > 0 && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 16px 0" }}>
          <h2 style={{
            fontFamily: "Quicksand, sans-serif",
            fontSize: 14,
            fontWeight: 800,
            margin: "0 0 4px",
            color: "hsl(var(--brand-emerald-300))",
          }}>
            {t("pages.audio_lessons.recommended_title")}
          </h2>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#a99fd9" }}>
            {t("pages.audio_lessons.recommended_subtitle")}
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {recommendedLessons.map((l) => renderLessonCard(l, true))}
          </div>
        </div>
      )}

      {/* All lessons */}
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "8px 16px",
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 12,
      }}>
        {otherLessons.length > 0 && recommendedLessons.length > 0 && (
          <h2 style={{
            fontFamily: "Quicksand, sans-serif",
            fontSize: 14,
            fontWeight: 800,
            margin: "4px 0 0",
            color: "#c7c0e8",
          }}>
            {t("pages.audio_lessons.all_lessons")}
          </h2>
        )}
        {otherLessons.map((l) => renderLessonCard(l))}
        {recommendedLessons.length === 0 && lessons.map((l) => renderLessonCard(l))}
        {lessons.length === 0 && <div style={{
        textAlign: "center",
        color: "#a99fd9",
        padding: 30
      }}>
            {"More lessons for this age group coming soon."}
          </div>}
      </div>

      {open && (
        <PlayerSheet
          lesson={open}
          series={activeSeries}
          autoPlay={playerAutoPlay}
          onClose={() => {
            setOpen(null);
            setActiveSeries(null);
            setPlayerAutoPlay(false);
          }}
          onLessonComplete={handleLessonComplete}
        />
      )}
    </div>;
}

// ─── Player ─────────────────────────────────────────────────────────
function PlayerSheet({
  lesson,
  series,
  autoPlay,
  onClose,
  onLessonComplete,
}: {
  lesson: Lesson;
  series: LessonSeries | null;
  autoPlay?: boolean;
  onClose: () => void;
  onLessonComplete?: (lessonId: string) => void;
}) {
  const lang = "en";
  const { t } = useTranslation();
  const [rate, setRate] = useState<number>(1);

  const text = useMemo(() => getLessonText(lesson, lang), [lesson, lang]);
  const paragraphs = text.paragraphs;

  const {
    paragraphIdx,
    setParagraphIdx,
    intent,
    playbackError,
    speaking,
    loading,
    error,
    play,
    pause,
    primeSpeakGesture,
  } = useLessonPlayback({
    paragraphs,
    lessonId: lesson.id,
    voiceId: VOICE_AMY_EN,
    modelId: MODEL_EN,
    playbackRate: rate,
    autoPlay,
    onLessonComplete,
  });

  const playing = intent === "playing";

  const handleClose = useCallback(() => {
    pause();
    onClose();
  }, [pause, onClose]);

  // Resume from saved index
  useEffect(() => {
    const r = loadResume();
    const saved = r[lesson.id] ?? 0;
    if (saved > 0 && saved < paragraphs.length) setParagraphIdx(saved);
    else if (saved >= paragraphs.length) setParagraphIdx(0);
  }, [lesson.id, paragraphs.length, setParagraphIdx]);

  // Persist position
  useEffect(() => {
    const r = loadResume();
    r[lesson.id] = paragraphIdx;
    saveResume(r);
  }, [lesson.id, paragraphIdx]);

  const seriesPart = series ? partIndexForLesson(series, lesson.id) : -1;
  const next = () => {
    if (paragraphIdx + 1 < paragraphs.length) setParagraphIdx(paragraphIdx + 1);
  };
  const prev = () => {
    if (paragraphIdx > 0) setParagraphIdx(paragraphIdx - 1);
  };
  return <div style={{
    position: "fixed",
    inset: 0,
    zIndex: 60,
    background: "rgba(8,5,25,0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center"
  }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} style={{
      width: "100%",
      maxWidth: 560,
      background: "linear-gradient(180deg, #1a1040 0%, #0f0c29 100%)",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: "16px 20px 28px",
      color: "#fff",
      boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
      maxHeight: "92vh",
      overflowY: "auto"
    }}>
        <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12
      }}>
          <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
            <div style={{
            fontSize: 28
          }}>{lesson.emoji}</div>
            <div>
              <h3 style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              fontFamily: "Quicksand, sans-serif"
            }}>{text.title}</h3>
              <div style={{
              fontSize: 11,
              color: "#a99fd9"
            }}>
                {series && seriesPart >= 0
                  ? t("pages.audio_lessons.series_part", {
                      series: series.title.en,
                      current: seriesPart + 1,
                      total: series.lessonIds.length,
                    })
                  : `${lesson.expert} · ${lesson.durationMin} ${t("pages.audio_lessons.min_2")}`}
              </div>
            </div>
          </div>
          <button onClick={handleClose} aria-label={t("pages.audio_lessons.close")} style={{
          color: "hsl(var(--brand-violet-300))",
          background: "rgba(167,139,250,0.15)",
          borderRadius: 999,
          width: 34,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer"
        }}>
            <X size={16} />
          </button>
        </div>

        {(error || playbackError) && <div style={{
        padding: 12,
        borderRadius: 12,
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.3)",
        color: "hsl(var(--brand-red-200))",
        fontSize: 13,
        marginBottom: 12
      }}>
            {error
              ? "Couldn't load Amy's voice right now. Please try again in a moment — you can still read the lesson below."
              : playbackError === "playback_blocked_tap_again"
                ? "Tap Play again to start Amy's voice."
                : "Amy's voice couldn't play this paragraph. Tap Play to try again."}
          </div>}

        {/* Progress dots */}
        <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 14
      }}>
          {paragraphs.map((_, i) => <div key={i} style={{
          flex: 1,
          height: 3,
          borderRadius: 2,
          background: i <= paragraphIdx ? "hsl(var(--brand-violet-500))" : "rgba(139,92,246,0.2)",
          transition: "background 0.3s"
        }} />)}
        </div>

        {/* Current paragraph (highlighted) */}
        <div style={{
        background: "rgba(139,92,246,0.10)",
        border: "1px solid rgba(139,92,246,0.3)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        fontSize: 15,
        lineHeight: 1.6,
        color: "#fff"
      }}>
          {paragraphs[paragraphIdx]}
        </div>

        {/* Mini transcript of all paragraphs */}
        <details style={{
        marginBottom: 14,
        color: "#c7c0e8"
      }}>
          <summary style={{
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          color: "hsl(var(--brand-violet-300))"
        }}>
            {"Show full transcript"}
          </summary>
          <div style={{
          marginTop: 10,
          display: "grid",
          gap: 10
        }}>
            {paragraphs.map((p, i) => <button key={i} onClick={() => setParagraphIdx(i)} style={{
            textAlign: "left",
            color: i === paragraphIdx ? "#fff" : "#c7c0e8",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            lineHeight: 1.55,
            opacity: i === paragraphIdx ? 1 : 0.85
          }}>
                <strong style={{
              color: "#a99fd9",
              marginRight: 6
            }}>{i + 1}.</strong>{p}
              </button>)}
          </div>
        </details>

        {/* Controls */}
        <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginBottom: 12
      }}>
          <button onClick={prev} disabled={paragraphIdx === 0} aria-label={t("pages.audio_lessons.previous")} style={{
          color: "#fff",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: 999,
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: paragraphIdx === 0 ? "default" : "pointer",
          opacity: paragraphIdx === 0 ? 0.4 : 1
        }}><SkipBack size={18} /></button>

          <button
            onPointerDown={() => {
              const txt = paragraphs[paragraphIdx];
              if (!txt) return;
              recordTtsUserGesture();
              primeSpeakGesture(txt);
              primeStaticAudioInUserGesture(txt, "default");
            }}
            onClick={() => {
              if (playing) pause();
              else play();
            }}
            aria-label={playing ? "Pause" : "Play"}
            style={{
          color: "#fff",
          background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
          border: "none",
          borderRadius: 999,
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(139,92,246,0.5)"
        }}>
            {!playing ? <Play size={26} style={{ marginLeft: 3 }} /> : loading && !speaking ? <Loader2 size={24} className="animate-spin" /> : <Pause size={26} />}
          </button>

          <button onClick={next} disabled={paragraphIdx === paragraphs.length - 1} aria-label={t("pages.audio_lessons.next")} style={{
          color: "#fff",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: 999,
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: paragraphIdx === paragraphs.length - 1 ? "default" : "pointer",
          opacity: paragraphIdx === paragraphs.length - 1 ? 0.4 : 1
        }}><SkipForward size={18} /></button>
        </div>

        {/* Rate */}
        <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }}>
          <Gauge size={14} color="#a99fd9" />
          <span style={{
          fontSize: 12,
          color: "#a99fd9",
          marginRight: 6
        }}>
            {"Speed"}
          </span>
          {[0.85, 1, 1.15, 1.3, 1.5].map(r => <button key={r} onClick={() => setRate(r)} style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "5px 10px",
          borderRadius: 999,
          border: "1px solid " + (rate === r ? "transparent" : "rgba(139,92,246,0.3)"),
          background: rate === r ? "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))" : "transparent",
          color: "#fff",
          cursor: "pointer"
        }}>{r}×</button>)}
        </div>

        <div style={{
        marginTop: 14,
        fontSize: 11,
        color: "#7a749b",
        textAlign: "center"
      }}>
          {"Narrated by Amy. Tap a paragraph in the transcript to jump to it."}
        </div>
      </div>
    </div>;
}
