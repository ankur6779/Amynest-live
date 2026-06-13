import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Headphones, LifeBuoy, Lock, RotateCcw } from "lucide-react";
import { PageStickyHeader } from "@/components/page-sticky-header";
import { useAppNavigate } from "@/components/app-link";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import {
  getLessonById,
  getLessonText,
  getRecommendedLessonsForCoachGoal,
  COACH_AUDIO_GOAL_STORAGE_KEY,
  firstIncompleteLessonId,
  markLessonComplete,
  LESSONS_COMPLETE_STORAGE_KEY,
  parseCompletedLessonIds,
  serializeCompletedLessonIds,
  lessonsForAge,
  type Lesson,
  type LessonSeries,
  type LessonTier,
} from "@/lib/audio-lessons";
import {
  AGE_TILE_META,
  findResumeTarget,
  lessonsForNavGroup,
  dataBucketForNav,
  isFreeSampleLessonForGroup,
  navGroupForLesson,
  type AgeNavGroup,
} from "@/lib/audio-lessons-nav";
import {
  loadLastAgeGroup,
  loadLastLessonId,
  loadResume,
  markPregenerateDone,
  recordLessonSkip,
  saveLastAgeGroup,
  saveLastLessonId,
  shouldSkipPregenerate,
} from "@/lib/audio-lessons-storage";
import {
  buildAmySignals,
  computeAgeRecommendations,
  computeAmyHomeState,
  computeEmergencyLesson,
} from "@/lib/amy-signals";
import type { EmergencyType } from "@workspace/amy-intelligence";
import { warmAudioLessonsOnPageOpen } from "@/lib/audio-lessons-audio-warmup";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { usePaywall } from "@/contexts/paywall-context";
import { useSubscription } from "@/hooks/use-subscription";
import { AgeTile } from "@/components/audio-lessons/age-tile";
import { AgeDetailScreen } from "@/components/audio-lessons/age-detail-screen";
import { AmyDailyPickCard } from "@/components/audio-lessons/daily-pick-card";
import { AmyQuickPlayCard } from "@/components/audio-lessons/quick-play-card";
import { AudioPlayerBar } from "@/components/audio-lessons/audio-player-bar";
import { EmergencySheet } from "@/components/audio-lessons/emergency-sheet";
import { PlayerSheet, type PlayerSheetPlayback } from "@/components/audio-lessons/player-sheet";
import type { LessonAccess } from "@/components/audio-lessons/lesson-card";

export default function AudioLessonsPage() {
  const { navigate, back } = useAppNavigate();
  const [selectedAge, setSelectedAge] = useState<AgeNavGroup | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [open, setOpen] = useState<Lesson | null>(null);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [playbackControls, setPlaybackControls] = useState<PlayerSheetPlayback | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [resumeMap, setResumeMap] = useState<Record<string, number>>(() => loadResume());
  const [activeSeries, setActiveSeries] = useState<LessonSeries | null>(null);
  const [playerAutoPlay, setPlayerAutoPlay] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const skipCoachGoalAutoAgeRef = useRef(false);
  const { t } = useTranslation();
  const lang = "en";
  const authFetch = useAuthFetch();
  const { openPaywall } = usePaywall();
  const sub = useSubscription();
  const isPremium = sub.isPremium;

  useEffect(() => {
    try {
      setCompletedIds(parseCompletedLessonIds(localStorage.getItem(LESSONS_COMPLETE_STORAGE_KEY)));
    } catch {
      setCompletedIds(new Set());
    }
    setResumeMap(loadResume());
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

  const resumeTarget = useMemo(
    () => findResumeTarget(resumeMap, loadLastLessonId()),
    [resumeMap],
  );

  useEffect(() => {
    if (!coachGoalId || skipCoachGoalAutoAgeRef.current) return;
    const recommended = getRecommendedLessonsForCoachGoal(coachGoalId, 1);
    if (recommended[0]) {
      setSelectedAge(navGroupForLesson(recommended[0]));
    }
  }, [coachGoalId]);

  useEffect(() => {
    if (!playerExpanded && open) {
      setResumeMap(loadResume());
    }
  }, [playerExpanded, open]);

  const openAgeDetail = useCallback((age: AgeNavGroup) => {
    setDetailLoading(true);
    setSelectedAge(age);
    saveLastAgeGroup(age);
    window.setTimeout(() => setDetailLoading(false), 320);
  }, []);

  const handleBack = useCallback(() => {
    if (emergencyOpen) {
      setEmergencyOpen(false);
      return;
    }
    if (playerExpanded) {
      setPlayerExpanded(false);
      return;
    }
    if (open) {
      setOpen(null);
      setPlaybackControls(null);
      setActiveSeries(null);
      return;
    }
    if (selectedAge) {
      skipCoachGoalAutoAgeRef.current = true;
      setSelectedAge(null);
      return;
    }
    back("audio-lessons-back");
  }, [emergencyOpen, playerExpanded, open, selectedAge, back]);

  usePageBackHandler(() => {
    handleBack();
    return true;
  }, [handleBack]);

  const amySignals = useMemo(() => buildAmySignals(), [completedIds, resumeMap]);
  const amyHome = useMemo(() => computeAmyHomeState(amySignals), [amySignals]);

  const ageRecommendations = useMemo(() => {
    if (!selectedAge) return { lessonIds: [] as string[], reason: "" };
    const amy = computeAgeRecommendations(amySignals, selectedAge);
    if (!coachGoalId) return amy;
    const coachLessons = getRecommendedLessonsForCoachGoal(coachGoalId, 3);
    const poolIds = new Set(lessonsForNavGroup(selectedAge).map((l) => l.id));
    const coachIds = coachLessons.filter((l) => poolIds.has(l.id)).map((l) => l.id);
    if (coachIds.length === 0) return amy;
    const merged = [...new Set([...coachIds, ...amy.lessonIds])].slice(0, 3);
    return { lessonIds: merged, reason: "coach_goal" };
  }, [selectedAge, amySignals, coachGoalId]);

  useEffect(() => {
    warmAudioLessonsOnPageOpen(authFetch, {
      lang,
      amyHome,
      resumeTarget,
      ageRecommendationIds: selectedAge ? ageRecommendations.lessonIds : undefined,
    });
  }, [
    authFetch,
    lang,
    amyHome,
    resumeTarget,
    selectedAge,
    ageRecommendations.lessonIds,
  ]);

  useEffect(() => {
    if (!isPremium || !selectedAge) return;
    const bucket = dataBucketForNav(selectedAge);
    if (shouldSkipPregenerate(bucket, lang)) return;
    const texts = lessonsForAge(bucket).flatMap((l) => getLessonText(l, lang).paragraphs);
    if (texts.length === 0) return;
    markPregenerateDone(bucket, lang);
    void authFetch(getApiUrl("/api/audio-lessons/pregenerate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    }).catch(() => {});
  }, [selectedAge, isPremium, lang, authFetch]);

  /** Warm TTS cache for the opened lesson so Play hits local cache first. */
  useEffect(() => {
    if (!open) return;
    const texts = getLessonText(open, lang).paragraphs;
    if (texts.length === 0) return;
    void authFetch(getApiUrl("/api/audio-lessons/pregenerate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    }).catch(() => {});
  }, [open?.id, lang, authFetch]);

  const getLessonAccessForLesson = useCallback(
    (lesson: Lesson): LessonAccess => {
      if (isPremium) return "open";
      const group = selectedAge ?? navGroupForLesson(lesson);
      return isFreeSampleLessonForGroup(lesson, group) ? "free-sample" : "locked";
    },
    [isPremium, selectedAge],
  );

  const getLessonAccess = useCallback(
    (lesson: Lesson): LessonAccess => getLessonAccessForLesson(lesson),
    [getLessonAccessForLesson],
  );

  const tierLabel = useCallback(
    (tier: LessonTier) => {
      if (tier === "quick") return t("pages.audio_lessons.tier_quick");
      if (tier === "deep") return t("pages.audio_lessons.tier_deep");
      return t("pages.audio_lessons.tier_standard");
    },
    [t],
  );

  const openLessonPlayer = useCallback(
    (l: Lesson, opts?: { series?: LessonSeries | null; autoPlay?: boolean }) => {
      if (open && open.id !== l.id) {
        const prevProgress = resumeMap[open.id] ?? 0;
        if (prevProgress > 0 && !completedIds.has(open.id)) {
          recordLessonSkip(open.id);
        }
      }
      setActiveSeries(opts?.series ?? null);
      setPlayerAutoPlay(!!opts?.autoPlay);
      setOpen(l);
      setPlayerExpanded(true);
      saveLastLessonId(l.id);
      const age = selectedAge ?? navGroupForLesson(l);
      saveLastAgeGroup(age);
    },
    [selectedAge, resumeMap, open, completedIds],
  );

  const handlePickLesson = useCallback(
    async (l: Lesson, opts?: { series?: LessonSeries | null; autoPlay?: boolean }) => {
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
        await authFetch(getApiUrl("/api/features/audio_lesson/consume"), { method: "POST" }).catch(() => {});
        openLessonPlayer(l, opts);
      } catch {
        openLessonPlayer(l, opts);
      } finally {
        setUnlocking(false);
      }
    },
    [unlocking, getLessonAccess, openLessonPlayer, openPaywall, authFetch],
  );

  const handleStartSeries = useCallback(
    (series: LessonSeries) => {
      const nextId = firstIncompleteLessonId(series, completedIds) ?? series.lessonIds[0];
      const lesson = getLessonById(nextId);
      if (!lesson) return;
      void handlePickLesson(lesson, { series, autoPlay: true });
    },
    [completedIds, handlePickLesson],
  );

  const handleLessonComplete = useCallback(
    (lessonId: string) => {
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
    },
    [activeSeries, completedIds, persistCompleted, openLessonPlayer, authFetch, getLessonAccess, openPaywall],
  );

  const handleResume = useCallback(() => {
    if (!resumeTarget) return;
    openAgeDetail(resumeTarget.ageGroup);
    const lesson = resumeTarget.lesson;
    void handlePickLesson(lesson);
  }, [resumeTarget, openAgeDetail, handlePickLesson]);

  const playLessonById = useCallback(
    (lessonId: string, autoPlay = true) => {
      const lesson = getLessonById(lessonId);
      if (!lesson) return;
      const age = navGroupForLesson(lesson);
      if (!selectedAge) saveLastAgeGroup(age);
      void handlePickLesson(lesson, { autoPlay });
    },
    [handlePickLesson, selectedAge],
  );

  const handleEmergencySelect = useCallback(
    (type: EmergencyType) => {
      setEmergencyOpen(false);
      const result = computeEmergencyLesson(type, selectedAge ?? loadLastAgeGroup());
      if (!result) return;
      const lesson = getLessonById(result.lessonId);
      if (lesson && !selectedAge) {
        openAgeDetail(navGroupForLesson(lesson));
      }
      playLessonById(result.lessonId, true);
    },
    [selectedAge, playLessonById, openAgeDetail],
  );

  const showMiniPlayer = open && !playerExpanded;

  return (
    <div
      className={`w-full max-w-full min-w-0 overflow-x-clip box-border${showMiniPlayer ? " scroll-safe--audio" : ""}`}
      style={{
        background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
        color: "#fff",
      }}
    >
      <PageStickyHeader
        onBack={handleBack}
        backLabel={t("pages.audio_lessons.back")}
        className="z-20 border-b border-violet-500/20 bg-[rgba(15,12,41,0.95)] backdrop-blur-md"
        innerClassName="amynest-page-inset max-w-[720px] mx-auto gap-3 !px-0"
        backButtonClassName="h-9 w-9 border-none bg-violet-400/15 text-[hsl(var(--brand-violet-300))] shadow-none"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Headphones size={20} color="hsl(var(--brand-violet-300))" aria-hidden />
          <h1 className="m-0 font-quicksand text-lg font-extrabold text-white">
            {t("pages.audio_lessons.amy_audio_lessons")}
          </h1>
        </div>
      </PageStickyHeader>

      {!selectedAge ? (
        <>
          <div className="amynest-page-inset" style={{ paddingTop: 20, paddingBottom: 8 }}>
            <p style={{ color: "#c7c0e8", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              {t("pages.audio_lessons.intro_home")}
            </p>
          </div>

          {resumeTarget && (
            <div className="amynest-page-inset" style={{ paddingTop: 8 }}>
              <button
                type="button"
                data-testid="resume-lesson-banner"
                onClick={handleResume}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(52,211,153,0.45)",
                  background: "rgba(52,211,153,0.08)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(52,211,153,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <RotateCcw size={18} color="hsl(var(--brand-emerald-300))" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "hsl(var(--brand-emerald-300))", fontWeight: 800 }}>
                    {t("pages.audio_lessons.resume_title")}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 14,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getLessonText(resumeTarget.lesson, lang).title}
                  </p>
                </div>
              </button>
            </div>
          )}

          {!isPremium && (
            <div className="amynest-page-inset" style={{ paddingTop: 12 }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(251,191,36,0.35)",
                  background: "rgba(251,191,36,0.08)",
                  color: "hsl(var(--brand-amber-200))",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Lock size={14} />
                {t("pages.audio_lessons.preview_note")}
              </div>
            </div>
          )}

          <div className="amynest-page-inset" style={{ paddingTop: 12, display: "grid", gap: 10 }}>
            {amyHome.quickPlay && (
              <AmyQuickPlayCard
                card={amyHome.quickPlay}
                onPlay={() => playLessonById(amyHome.quickPlay!.lessonId, true)}
              />
            )}
            {amyHome.dailyPick && (
              <AmyDailyPickCard
                card={amyHome.dailyPick}
                onPlay={() => playLessonById(amyHome.dailyPick!.lessonId, true)}
              />
            )}
          </div>

          <div className="amynest-page-inset" style={{ paddingTop: 12, paddingBottom: 4 }}>
            <button
              type="button"
              data-testid="emergency-cta"
              onClick={() => setEmergencyOpen(true)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(236,72,153,0.4)",
                background: "rgba(236,72,153,0.1)",
                color: "hsl(var(--brand-pink-200))",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <LifeBuoy size={16} />
              {t("pages.audio_lessons.emergency_cta")}
            </button>
          </div>

          <div
            className="amynest-page-inset"
            style={{
              paddingTop: 16,
              paddingBottom: 16,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
            data-testid="age-tiles-grid"
          >
            {AGE_TILE_META.map((meta) => (
              <AgeTile key={meta.group} meta={meta} onExplore={() => openAgeDetail(meta.group)} />
            ))}
          </div>
        </>
      ) : (
        <AgeDetailScreen
          ageGroup={selectedAge}
          loading={detailLoading}
          isPremium={isPremium}
          recommendedLessonIds={ageRecommendations.lessonIds}
          recommendationReason={ageRecommendations.reason}
          completedIds={completedIds}
          resumeMap={resumeMap}
          activeLessonId={open?.id ?? null}
          unlocking={unlocking}
          getLessonAccess={getLessonAccess}
          tierLabel={tierLabel}
          onPickLesson={(l, opts) => void handlePickLesson(l, opts)}
          onStartSeries={handleStartSeries}
          onUnlock={() => openPaywall("audio_lessons")}
        />
      )}

      {open && (
        <PlayerSheet
          key={open.id}
          lesson={open}
          series={activeSeries}
          autoPlay={playerAutoPlay}
          visible={playerExpanded}
          onMinimize={() => setPlayerExpanded(false)}
          onLessonComplete={handleLessonComplete}
          onPlaybackChange={setPlaybackControls}
        />
      )}

      <AnimatePresence>
        {showMiniPlayer && playbackControls && (
          <AudioPlayerBar
            lesson={open}
            playing={playbackControls.playing}
            loading={playbackControls.loading}
            onTogglePlay={() => {
              if (playbackControls.playing) playbackControls.pause();
              else playbackControls.play();
            }}
            onExpand={() => setPlayerExpanded(true)}
          />
        )}
      </AnimatePresence>

      <EmergencySheet
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        onSelect={handleEmergencySelect}
      />
    </div>
  );
}
