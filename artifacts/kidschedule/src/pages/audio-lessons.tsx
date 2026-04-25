import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Volume2, Pause, Play, SkipBack, SkipForward, Headphones,
  Sparkles, Gauge, X, Clock, Loader2, Lock,
} from "lucide-react";
import {
  LESSONS, lessonsForAge, getLessonText, getAgeLabel,
  type AgeBucket, type Lesson,
} from "@/lib/audio-lessons";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { usePaywall } from "@/contexts/paywall-context";
import { useSubscription } from "@/hooks/use-subscription";
import { useAmyVoice } from "@/hooks/use-amy-voice";

// Hindi Amy voice — Anjura (Calm & Warm Hindi Female) via eleven_multilingual_v2.
const VOICE_AMY_HINDI    = "TllHtNijgXBd45uTSCS7"; // Anjura — Indian Hindi Female
const MODEL_MULTILINGUAL = "eleven_multilingual_v2";

const AGE_ORDER: AgeBucket[] = ["0-2", "2-4", "5-7", "8-10", "10+"];

const RESUME_KEY = "amynest_audio_resume_v1";
type ResumeMap = Record<string, number>;
const loadResume = (): ResumeMap => {
  try { return JSON.parse(localStorage.getItem(RESUME_KEY) ?? "{}"); } catch { return {}; }
};
const saveResume = (m: ResumeMap) => localStorage.setItem(RESUME_KEY, JSON.stringify(m));

export default function AudioLessonsPage() {
  const [, setLocation] = useLocation();
  const [age, setAge] = useState<AgeBucket>("2-4");
  const [open, setOpen] = useState<Lesson | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const authFetch = useAuthFetch();
  const { openPaywall } = usePaywall();
  const sub = useSubscription();

  const lessons = lessonsForAge(age);

  // Pre-warm the audio cache for all Hindi paragraphs of the current age
  // group. Fire-and-forget — this is a background optimisation; failures are
  // silently ignored. Premium-only: free users have limited plays anyway.
  const isPremium = sub.isPremium;
  useEffect(() => {
    if (!isPremium) return;
    const texts = lessonsForAge(age).flatMap((l) => getLessonText(l, "hi").paragraphs);
    if (texts.length === 0) return;
    void authFetch(getApiUrl("/api/audio-lessons/pregenerate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    }).catch(() => {});
  }, [age, isPremium]);

  // Per-age-group access: index 0 is the free sample, rest are premium-only.
  type LessonAccess = "free-sample" | "locked" | "open";
  const getLessonAccess = (idx: number): LessonAccess => {
    if (isPremium) return "open";
    return idx === 0 ? "free-sample" : "locked";
  };

  // Global Paywall: free users get 1 audio lesson per UTC day. Premium users
  // bypass server-side. We always call /consume — the server returns 200
  // (no-op for premium) or 402 feature_locked when the cap is exhausted.
  const handlePickLesson = async (l: Lesson, idx: number) => {
    if (unlocking) return;

    // Non-free lesson → immediately open paywall for free users
    if (!isPremium && idx !== 0) {
      openPaywall("audio_lessons");
      return;
    }

    setUnlocking(true);
    try {
      const res = await authFetch(
        getApiUrl("/api/features/audio_lesson/consume"),
        { method: "POST" },
      );
      if (res.status === 402) {
        openPaywall("audio_lessons");
        return;
      }
      if (!res.ok) {
        // Network / server error — best-effort: still open the lesson so the
        // user isn't blocked by infra issues. Counter wasn't burned because
        // featureGate refunds on non-2xx.
        setOpen(l);
        return;
      }
      sub.refresh();
      setOpen(l);
    } catch {
      // Same fail-open behaviour as above.
      setOpen(l);
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
      color: "#fff",
      paddingBottom: 80,
    }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
        background: "linear-gradient(180deg, rgba(15,12,41,0.95) 0%, rgba(15,12,41,0.7) 100%)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(139,92,246,0.2)",
      }}>
        <button
          onClick={() => setLocation("/amy-coach")}
          style={{ color: "#c4b5fd", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Headphones size={20} color="#c4b5fd" />
          <h1 style={{ fontFamily: "Quicksand, sans-serif", fontSize: 18, fontWeight: 800, margin: 0 }}>
            Amy Audio Lessons
          </h1>
        </div>
      </div>

      {/* Intro */}
      <div style={{ padding: "20px 16px 8px", maxWidth: 720, margin: "0 auto" }}>
        <p style={{ color: "#c7c0e8", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          {lang === "hi"
            ? "हाथ भरे हैं? Amy आपको आपके बच्चे की उम्र के हिसाब से सबसे जरूरी parenting topics समझाएगी। हर lesson 3–5 मिनट का है।"
            : lang === "hinglish"
            ? "Haath bhare hain? Amy aapko bacche ki umra ke hisaab se important parenting topics samjhayegi. Har lesson 3–5 minute ka hai."
            : "Hands full? Let Amy talk you through the most important parenting topics for your child's age group. Each lesson is 3–5 minutes. Tap any lesson to listen."}
        </p>
      </div>

      {/* Age selector */}
      <div style={{
        display: "flex", gap: 8, overflowX: "auto", padding: "12px 16px",
        scrollbarWidth: "none",
      }} className="ws-no-scrollbar">
        {AGE_ORDER.map((a) => {
          const active = a === age;
          return (
            <button
              key={a}
              onClick={() => setAge(a)}
              style={{
                whiteSpace: "nowrap",
                padding: "9px 14px",
                borderRadius: 999,
                border: "1px solid " + (active ? "transparent" : "rgba(139,92,246,0.3)"),
                background: active
                  ? "linear-gradient(135deg, #8b5cf6, #ec4899)"
                  : "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: active ? "0 4px 12px rgba(139,92,246,0.4)" : "none",
              }}
            >
              {getAgeLabel(a, lang)}
            </button>
          );
        })}
      </div>

      {/* Lesson grid */}
      <div style={{
        maxWidth: 720, margin: "0 auto",
        padding: "8px 16px",
        display: "grid", gridTemplateColumns: "1fr", gap: 12,
      }}>
        {lessons.map((l, idx) => {
          const text = getLessonText(l, lang);
          const access = getLessonAccess(idx);
          const isLocked = access === "locked";
          const isFree = access === "free-sample";

          return (
            <button
              key={l.id}
              onClick={() => void handlePickLesson(l, idx)}
              disabled={unlocking}
              style={{
                textAlign: "left",
                background: isLocked
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(255,255,255,0.06)",
                border: isLocked
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
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {/* Free / Lock badge */}
              {isFree && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  color: "#fff", fontSize: 10, fontWeight: 800,
                  padding: "3px 8px", borderRadius: 999,
                  letterSpacing: "0.06em",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.45)",
                }}>
                  ✦ FREE
                </div>
              )}
              {isLocked && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: "rgba(251,191,36,0.15)",
                  border: "1px solid rgba(251,191,36,0.5)",
                  color: "#fbbf24", fontSize: 10, fontWeight: 800,
                  padding: "3px 8px", borderRadius: 999,
                  letterSpacing: "0.06em",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Lock size={9} /> PREMIUM
                </div>
              )}

              {/* Emoji icon */}
              <div style={{
                fontSize: 30, lineHeight: 1, width: 48, height: 48,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isLocked ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.15)",
                borderRadius: 12,
                flexShrink: 0,
              }}>{l.emoji}</div>

              <div style={{ flex: 1, minWidth: 0, paddingRight: isLocked || isFree ? 60 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{
                    margin: 0, fontSize: 15, fontWeight: 800,
                    fontFamily: "Quicksand, sans-serif",
                    color: isLocked ? "rgba(255,255,255,0.7)" : "#fff",
                  }}>
                    {text.title}
                  </h3>
                </div>
                <p style={{ margin: "0 0 8px", color: isLocked ? "rgba(199,192,232,0.6)" : "#c7c0e8", fontSize: 13, lineHeight: 1.45 }}>
                  {text.description}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, color: isLocked ? "rgba(169,159,217,0.5)" : "#a99fd9" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} /> {l.durationMin} min
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Sparkles size={12} /> {l.expert}
                  </span>
                </div>
              </div>

              {/* Right icon */}
              {isLocked
                ? <Lock size={16} color="rgba(251,191,36,0.6)" style={{ flexShrink: 0, marginTop: 4, display: "none" }} />
                : <Volume2 size={18} color="#c4b5fd" style={{ flexShrink: 0, marginTop: 4 }} />
              }
            </button>
          );
        })}
        {lessons.length === 0 && (
          <div style={{ textAlign: "center", color: "#a99fd9", padding: 30 }}>
            {lang === "hi" ? "इस आयु वर्ग के लिए जल्द और lessons आएंगे।"
              : lang === "hinglish" ? "Is age group ke liye aur lessons jald aayenge."
              : "More lessons for this age group coming soon."}
          </div>
        )}
      </div>

      {open && <PlayerSheet lesson={open} lang={lang} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ─── Player ─────────────────────────────────────────────────────────
function PlayerSheet({ lesson, lang, onClose }: { lesson: Lesson; lang: string; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [paragraphIdx, setParagraphIdx] = useState(0);
  const [rate, setRate] = useState<number>(1);

  // Display text follows the app language (titles, expert credit, buttons).
  const displayText = useMemo(() => getLessonText(lesson, lang), [lesson, lang]);
  // Audio is ALWAYS in Hindi — the multilingual model handles Devanagari script.
  // `text` is the alias used by the player controls and transcript below.
  const text = useMemo(() => getLessonText(lesson, "hi"), [lesson]);
  const paragraphs = text.paragraphs;

  // Auto-advance to the next paragraph when the current one finishes
  // playing, or stop if we're at the end.
  const handleFinished = useCallback(() => {
    setParagraphIdx((i) => {
      if (i + 1 >= paragraphs.length) {
        setPlaying(false);
        return i;
      }
      return i + 1;
    });
  }, [paragraphs.length]);

  const { speaking, loading, error, speak, stop } = useAmyVoice({
    voiceId: VOICE_AMY_HINDI,
    modelId: MODEL_MULTILINGUAL,
    playbackRate: rate,
    onFinished: handleFinished,
  });

  // Resume from saved index
  useEffect(() => {
    const r = loadResume();
    const saved = r[lesson.id] ?? 0;
    if (saved > 0 && saved < paragraphs.length) setParagraphIdx(saved);
    else if (saved >= paragraphs.length) setParagraphIdx(0);
  }, [lesson.id, paragraphs.length]);

  // Persist position
  useEffect(() => {
    const r = loadResume();
    r[lesson.id] = paragraphIdx;
    saveResume(r);
  }, [lesson.id, paragraphIdx]);

  // Drive playback: when `playing` flips on (or paragraph/lang changes
  // while playing) start a fresh synth; when it flips off, stop.
  useEffect(() => {
    if (!playing) {
      stop();
      return;
    }
    const txt = paragraphs[paragraphIdx];
    if (!txt) { setPlaying(false); return; }
    void speak(txt);
  }, [playing, paragraphIdx, paragraphs, speak, stop]);

  const next = () => {
    if (paragraphIdx + 1 < paragraphs.length) setParagraphIdx(paragraphIdx + 1);
  };
  const prev = () => {
    if (paragraphIdx > 0) setParagraphIdx(paragraphIdx - 1);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(8,5,25,0.85)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560,
          background: "linear-gradient(180deg, #1a1040 0%, #0f0c29 100%)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: "16px 20px 28px",
          color: "#fff",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
          maxHeight: "92vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 28 }}>{lesson.emoji}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: "Quicksand, sans-serif" }}>{text.title}</h3>
              <div style={{ fontSize: 11, color: "#a99fd9" }}>{lesson.expert} · {lesson.durationMin} min</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ color: "#c4b5fd", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: 12, borderRadius: 12,
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#fecaca", fontSize: 13, marginBottom: 12,
          }}>
            {lang === "hi"
              ? "Amy की आवाज़ अभी नहीं चल पा रही। कुछ देर बाद try करें — आप नीचे lesson पढ़ भी सकते हैं।"
              : lang === "hinglish"
              ? "Amy ki awaaz abhi load nahi ho payi. Thodi der baad try karein — aap neeche lesson padh bhi sakte hain."
              : "Couldn't load Amy's voice right now. Please try again in a moment — you can still read the lesson below."}
          </div>
        )}

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {paragraphs.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= paragraphIdx ? "#8b5cf6" : "rgba(139,92,246,0.2)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Current paragraph (highlighted) */}
        <div style={{
          background: "rgba(139,92,246,0.10)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: 14, padding: 14,
          marginBottom: 14,
          fontSize: 15, lineHeight: 1.6,
          color: "#fff",
        }}>
          {paragraphs[paragraphIdx]}
        </div>

        {/* Mini transcript of all paragraphs */}
        <details style={{ marginBottom: 14, color: "#c7c0e8" }}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#c4b5fd" }}>
            {lang === "hi" ? "पूरा transcript दिखाएं" : lang === "hinglish" ? "Poora transcript dikhayein" : "Show full transcript"}
          </summary>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {paragraphs.map((p, i) => (
              <button
                key={i}
                onClick={() => setParagraphIdx(i)}
                style={{
                  textAlign: "left", color: i === paragraphIdx ? "#fff" : "#c7c0e8",
                  background: "transparent",
                  border: "none", padding: 0, cursor: "pointer",
                  fontSize: 13, lineHeight: 1.55,
                  opacity: i === paragraphIdx ? 1 : 0.85,
                }}
              >
                <strong style={{ color: "#a99fd9", marginRight: 6 }}>{i + 1}.</strong>{p}
              </button>
            ))}
          </div>
        </details>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
          <button
            onClick={prev}
            disabled={paragraphIdx === 0}
            aria-label="Previous"
            style={{
              color: "#fff", background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(139,92,246,0.3)", borderRadius: 999,
              width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: paragraphIdx === 0 ? "default" : "pointer", opacity: paragraphIdx === 0 ? 0.4 : 1,
            }}
          ><SkipBack size={18} /></button>

          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            style={{
              color: "#fff", background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
              border: "none", borderRadius: 999, width: 64, height: 64,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(139,92,246,0.5)",
            }}
          >
            {loading && playing ? (
              <Loader2 size={24} className="animate-spin" />
            ) : playing && speaking ? (
              <Pause size={26} />
            ) : playing ? (
              // Playing has been requested but audio is still preparing.
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Play size={26} style={{ marginLeft: 3 }} />
            )}
          </button>

          <button
            onClick={next}
            disabled={paragraphIdx === paragraphs.length - 1}
            aria-label="Next"
            style={{
              color: "#fff", background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(139,92,246,0.3)", borderRadius: 999,
              width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: paragraphIdx === paragraphs.length - 1 ? "default" : "pointer",
              opacity: paragraphIdx === paragraphs.length - 1 ? 0.4 : 1,
            }}
          ><SkipForward size={18} /></button>
        </div>

        {/* Rate */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Gauge size={14} color="#a99fd9" />
          <span style={{ fontSize: 12, color: "#a99fd9", marginRight: 6 }}>
            {lang === "hi" ? "गति" : lang === "hinglish" ? "Speed" : "Speed"}
          </span>
          {[0.85, 1, 1.15, 1.3, 1.5].map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              style={{
                fontSize: 11, fontWeight: 700,
                padding: "5px 10px", borderRadius: 999,
                border: "1px solid " + (rate === r ? "transparent" : "rgba(139,92,246,0.3)"),
                background: rate === r ? "linear-gradient(135deg, #8b5cf6, #ec4899)" : "transparent",
                color: "#fff", cursor: "pointer",
              }}
            >{r}×</button>
          ))}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: "#7a749b", textAlign: "center" }}>
          {lang === "hi"
            ? "Amy की natural आवाज़। Jump करने के लिए transcript में paragraph tap करें।"
            : lang === "hinglish"
            ? "Amy ki natural awaaz. Jump karne ke liye transcript mein paragraph tap karein."
            : "Narrated by Amy. Tap a paragraph in the transcript to jump to it."}
        </div>
      </div>
    </div>
  );
}
