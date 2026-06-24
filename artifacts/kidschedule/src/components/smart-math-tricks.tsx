import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useToast } from "@/hooks/use-toast";
import { audioManager } from "@/lib/audio-manager";
import { lookupStaticAudioUrl, primeStaticAudioInUserGesture } from "@/lib/static-audio";
import {
  MATH_TRICKS,
  getMathTrickMeta,
  pickTricksSpaced,
  buildVisualSequence,
  specIsRenderable,
  createLearningSignals,
  applyLearningSignal,
  deriveAdaptationProfile,
  buildParentInsights,
  type MathTrick,
  type MathTrickAge as TrickAge,
  type TrickMastery,
  type AdaptationProfile,
  type ChildLearningSignals,
  type LearningSignalEvent,
  type LearningSessionEvent,
  type ParentInsight,
} from "@workspace/math-tricks";
import {
  ExampleStepsVisual,
  FingerGroupsVisual,
  NumberLineVisual,
} from "@/components/math-trick-visuals";
import {
  AnimatedMathScene,
  TryItInteractionLayer,
  ParentInsightCard,
  type SceneCompletionSummary,
} from "@/components/math-animation";
import { MathPlayground } from "@/components/math-playground";
import { LearningLoadMoreButton } from "@/components/learning-load-more-button";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  PremiumActionGate,
  type HubModuleActionGateState,
} from "@/components/hub-module-page-shell";
import {
  scheduleLearningZoneAudioPrewarm,
  buildLearningZoneAudioStateKey,
} from "@/lib/learning-zone-audio-prewarm";

import { useTranslation } from "react-i18next";

const TRICKS = MATH_TRICKS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function dateSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
}
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function pickTodayTricks(
  pool: MathTrick[],
  childName: string,
  seenIds: string[],
  mastery: Record<string, TrickMastery>,
  starIds: string[],
): MathTrick[] {
  const seed = dateSeed(todayStr() + childName);
  const fresh = pool.filter((t) => !seenIds.includes(t.id));
  const src = fresh.length >= 2 ? fresh : pool;
  return pickTricksSpaced(src, 2, seed, mastery, starIds);
}

function bumpMastery(
  prev: Record<string, TrickMastery>,
  trickId: string,
  correct: boolean,
): Record<string, TrickMastery> {
  const m = prev[trickId] ?? { correct: 0, attempts: 0 };
  return {
    ...prev,
    [trickId]: {
      correct: m.correct + (correct ? 1 : 0),
      attempts: m.attempts + 1,
    },
  };
}

function recordStreakDay(st: MathState): MathState {
  const today = todayStr();
  if (st.lastStreakDate === today) return st;
  const continued = st.lastStreakDate === yesterdayStr();
  return {
    ...st,
    streakDays: continued ? st.streakDays + 1 : 1,
    lastStreakDate: today,
  };
}

const LS = "amynest_math_tricks";
type MathState = {
  date: string;
  seenIds: string[];
  starIds: string[];
  practiceIdx: number;
  practiceResults: Record<string, boolean>;
  mastery: Record<string, TrickMastery>;
  streakDays: number;
  lastStreakDate: string;
  /** Cognition events for the Parent Insight Layer (Phase 8). */
  cognition: LearningSessionEvent[];
};

function defaultMathState(): MathState {
  return {
    date: todayStr(),
    seenIds: [],
    starIds: [],
    practiceIdx: 0,
    practiceResults: {},
    mastery: {},
    streakDays: 0,
    lastStreakDate: "",
    cognition: [],
  };
}

/** Resolve a trick's taught strategy + operation for cognition logging. */
function trickStrategy(trickId: string): { operation: string; strategy?: LearningSessionEvent["strategy"] } {
  const spec = getMathTrickMeta(trickId).visualSequence;
  if (!spec || !specIsRenderable(spec)) return { operation: "quiz" };
  const seq = buildVisualSequence(spec);
  return { operation: seq.operation, strategy: seq.meta?.strategy };
}

function loadMathState(childName: string): MathState {
  try {
    const raw = localStorage.getItem(`${LS}_${childName}`);
    if (raw) {
      const p = JSON.parse(raw) as Partial<MathState>;
      const base = { ...defaultMathState(), ...p };
      if (base.date !== todayStr()) {
        return {
          ...base,
          date: todayStr(),
          seenIds: (base.seenIds ?? []).slice(-14),
          practiceIdx: 0,
          practiceResults: {},
        };
      }
      return {
        ...defaultMathState(),
        ...p,
        mastery: p.mastery ?? {},
        streakDays: p.streakDays ?? 0,
        lastStreakDate: p.lastStreakDate ?? "",
      };
    }
  } catch (e) {
    console.error("REAL ERROR:", e);
  }
  return defaultMathState();
}
function saveMathState(childName: string, st: MathState) {
  try {
    localStorage.setItem(`${LS}_${childName}`, JSON.stringify(st));
  } catch (e) { console.error("REAL ERROR:", e); }
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const MATH_STYLES = `
  @keyframes mt-appear  { from { opacity:0; transform:translateY(12px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
  @keyframes mt-correct { 0% { transform:scale(1) } 25% { transform:scale(1.06) } 70% { transform:scale(1.02) } 100% { transform:scale(1) } }
  @keyframes mt-wrong   { 0% { transform:translateX(0) } 20% { transform:translateX(-8px) } 40% { transform:translateX(8px) } 60% { transform:translateX(-6px) } 80% { transform:translateX(6px) } 100% { transform:translateX(0) } }
  @keyframes mt-pop     { 0% { opacity:0; transform:scale(0.3) } 60% { transform:scale(1.15) } 100% { opacity:1; transform:scale(1) } }
  @keyframes mt-float   { 0% { opacity:1; transform:translateY(0) scale(1) } 100% { opacity:0; transform:translateY(-64px) scale(1.8) } }
  @keyframes mt-shine   { 0% { background-position:200% center } 100% { background-position:-200% center } }
`;

// ─── Floating stars ───────────────────────────────────────────────────────────

function FloatStars({
  k
}: {
  k: number;
}) {
  return <div style={{
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "visible"
  }} aria-hidden>
      {["⭐", "✨", "🌟", "💫", "⭐", "✨"].map((s, i) => <span key={`${k}-${i}`} style={{
      position: "absolute",
      left: `${10 + i * 15}%`,
      bottom: "20%",
      fontSize: 18 + i % 3 * 6,
      animation: `mt-float ${0.7 + i * 0.1}s ${i * 0.07}s ease-out forwards`
    }}>{s}</span>)}
    </div>;
}

// ─── Trick card ───────────────────────────────────────────────────────────────

function TrickCard({
  trick,
  childName,
  ageYears,
  adaptationProfile,
  starred,
  onStar,
  onPracticeResult,
  onSignal,
  onSceneComplete,
  expanded,
  onToggle,
  gate,
  showPractice = false,
}: {
  trick: MathTrick;
  childName: string;
  ageYears: number;
  adaptationProfile?: AdaptationProfile;
  starred: boolean;
  onStar(): void;
  onPracticeResult?(correct: boolean): void;
  onSignal?(event: LearningSignalEvent): void;
  onSceneComplete?(trickId: string, summary: SceneCompletionSummary): void;
  expanded: boolean;
  onToggle(): void;
  gate: HubModuleActionGateState;
  showPractice?: boolean;
}) {
  const {
    t
  } = useTranslation();
  const {
    speak,
    pause,
    speaking,
    loading,
    error,
    activePhrase,
    primeSpeakGesture,
  } = useAmyVoice();
  const { toast } = useToast();
  const trickSpeakText = useMemo(() => trick.audioText.trim(), [trick.audioText]);
  const trickSpeakOpts = useMemo(
    () => ({
      catalogPlayback: true as const,
      staticCatalogTexts: [trickSpeakText],
    }),
    [trickSpeakText],
  );
  const trickActiveKeys = useMemo(() => {
    const keys = new Set<string>();
    if (trickSpeakText) keys.add(trickSpeakText.toLowerCase());
    return keys;
  }, [trickSpeakText]);
  const isThisTrickActive =
    activePhrase != null && trickActiveKeys.has(activePhrase.toLowerCase());
  const [hearTrickPending, setHearTrickPending] = useState(false);
  const hearTrickPlaybackRef = useRef(false);
  const hearTrickActive =
    hearTrickPending || (isThisTrickActive && (speaking || loading));
  const [practiceMode, setPracticeMode] = useState(false);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [floatKey, setFloatKey] = useState(0);
  const meta = getMathTrickMeta(trick.id);
  const animatedSequence = useMemo(() => {
    const spec = meta.visualSequence;
    if (!spec || !specIsRenderable(spec)) return null;
    return buildVisualSequence(spec);
  }, [meta.visualSequence]);
  const handleSpeak = useCallback(async () => {
    audioManager.unlockFromUserGesture();
    const isPlaying =
      hearTrickPlaybackRef.current ||
      hearTrickPending ||
      (isThisTrickActive && (speaking || loading));
    if (isPlaying) {
      pause();
      hearTrickPlaybackRef.current = false;
      setHearTrickPending(false);
      return;
    }
    hearTrickPlaybackRef.current = true;
    setHearTrickPending(true);
    try {
      const res = await speak(trickSpeakText, trickSpeakOpts);
      if (!res?.success) {
        toast({
          title: "Voice unavailable",
          description: res?.error?.replace(/_/g, " ") ?? "Could not play this trick.",
          variant: "destructive",
        });
      }
    } finally {
      hearTrickPlaybackRef.current = false;
      setHearTrickPending(false);
    }
  }, [
    hearTrickPending,
    isThisTrickActive,
    speaking,
    loading,
    speak,
    pause,
    trickSpeakText,
    trickSpeakOpts,
    toast,
  ]);

  useEffect(() => {
    if (!error) return;
    toast({
      title: "Voice unavailable",
      description: error.replace(/_/g, " "),
      variant: "destructive",
    });
  }, [error, toast]);
  const handlePrimeSpeak = useCallback(() => {
    audioManager.unlockFromUserGesture();
    if (trickSpeakText) {
      primeStaticAudioInUserGesture(trickSpeakText, "default");
    }
    primeSpeakGesture(trickSpeakText, trickSpeakOpts);
  }, [primeSpeakGesture, trickSpeakText, trickSpeakOpts]);
  const handleSubmit = useCallback(() => {
    if (!selected) return;
    setSubmitted(true);
    const ok = selected === trick.practiceQ.answer;
    onPracticeResult?.(ok);
    if (ok) {
      setFloatKey((k) => k + 1);
      void speak("Correct! Well done!", { catalogPlayback: true });
      onStar();
    } else {
      void speak(`The correct answer is ${trick.practiceQ.answer}`);
    }
  }, [selected, trick, speak, onStar, onPracticeResult]);
  const resetPractice = () => {
    setSelected(null);
    setSubmitted(false);
    setPracticeMode(false);
  };
  const isCorrect = submitted && selected === trick.practiceQ.answer;
  const isWrong = submitted && selected !== trick.practiceQ.answer;
  return <div className="rounded-2xl overflow-hidden transition-all" style={{
    background: "rgba(255,255,255,0.05)",
    border: `1.5px solid rgba(255,255,255,0.1)`,
    animation: "mt-appear 300ms ease both"
  }}>
      {/* Card header */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span style={{
        fontSize: 28
      }}>{trick.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm leading-tight">{trick.title}</p>
          <p className="text-[11px] mt-0.5 truncate" style={{
          color: "rgba(255,255,255,0.45)"
        }}>{trick.trick}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {starred && <span style={{
          fontSize: 16
        }}>⭐</span>}
          <span style={{
          color: "rgba(255,255,255,0.35)",
          fontSize: 18
        }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && <div className="px-4 pb-4 space-y-3" style={{
      animation: "mt-appear 200ms ease both"
    }}>
          {/* Example box */}
          {childName.trim() && (
            <p className="text-center text-xs font-bold" style={{ color: "hsl(var(--brand-amber-300))" }}>
              {t("components.smart_math_tricks.amy_greeting", { name: childName.trim() })}
            </p>
          )}

          <div className="rounded-xl px-4 py-3 text-center" style={{
        background: `${trick.color}22`,
        border: `1px solid ${trick.color}44`
      }}>
            <p className="text-xs font-bold mb-1" style={{
          color: trick.color
        }}>{t("components.smart_math_tricks.how_it_works")}</p>
            <p className="font-black text-white text-base leading-snug">{trick.trick}</p>
          </div>
          {animatedSequence && !interactiveMode && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-white/40 px-0.5">
                {t("components.smart_math_tricks.see_it_animate")}
              </p>
              <AnimatedMathScene
                sequence={animatedSequence}
                ageYears={ageYears}
                accentColor={trick.color}
                adaptationProfile={adaptationProfile}
                onSignal={onSignal}
                onComplete={(summary) => onSceneComplete?.(trick.id, summary)}
              />
            </div>
          )}

          {animatedSequence && interactiveMode && (
            <div
              className="rounded-2xl px-3 py-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <TryItInteractionLayer
                sequence={animatedSequence}
                ageYears={ageYears}
                accentColor={trick.color}
              />
            </div>
          )}

          {meta.exampleSteps.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-white/40 px-0.5">{t("components.smart_math_tricks.steps")}</p>
              <ExampleStepsVisual steps={meta.exampleSteps} />
            </div>
          )}

          {!animatedSequence && meta.visual === "fingers" && <FingerGroupsVisual count={6} />}

          {!animatedSequence && meta.visual === "numberline" && <NumberLineVisual meta={meta} />}

          <div className="rounded-xl px-4 py-3 text-center font-mono" style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
            <p className="text-xs text-white/40 mb-1 font-sans font-bold">{t("components.smart_math_tricks.example")}</p>
            <p className="text-white font-black text-sm">{trick.example}</p>
          </div>

          <div
            className="rounded-xl px-3 py-2.5"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            <p className="text-[10px] font-bold text-indigo-300/90 mb-0.5">
              {t("components.smart_math_tricks.parent_tip")}
            </p>
            <p className="text-[11px] text-white/70 leading-snug">{meta.parentTip}</p>
          </div>

          {/* Interactive Try-It exit */}
          {interactiveMode && (
            <button
              onClick={() => setInteractiveMode(false)}
              className="w-full py-2 rounded-xl font-bold text-xs text-white/60 hover:text-white/80 transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              {t("components.smart_math_tricks.back_to_trick")}
            </button>
          )}

          {/* Actions row */}
          {!practiceMode && !interactiveMode && <div className="flex gap-2 flex-wrap">
              <button
                onPointerDown={handlePrimeSpeak}
                onClick={handleSpeak}
                className="flex-1 min-w-[96px] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                style={{
          background: hearTrickActive ? `${trick.color}33` : "rgba(255,255,255,0.1)",
          border: `1.5px solid ${hearTrickActive ? trick.color : "rgba(255,255,255,0.15)"}`,
          color: hearTrickActive ? trick.color : "rgba(255,255,255,0.7)"
        }}>
                {hearTrickActive && loading ? "⏳" : hearTrickActive ? "⏹" : "🔈"}{" "}
                {hearTrickActive ? t("components.smart_math_tricks.stop") : t("components.smart_math_tricks.hear_trick")}
              </button>
              {animatedSequence && <PremiumActionGate gate={gate} className="flex-1 min-w-[88px]" label="Unlock interactive math practice">
                <button onClick={() => setInteractiveMode(true)} className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95" style={{
          background: `${trick.color}22`,
          border: `1.5px solid ${trick.color}55`,
          color: trick.color
        }}>
                  {t("components.smart_math_tricks.play_with_it")}
                </button>
              </PremiumActionGate>}
              {showPractice && <PremiumActionGate gate={gate} className="flex-1 min-w-[88px]" label="Unlock smart math practice">
                <button onClick={() => setPracticeMode(true)} className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95" style={{
          background: "rgba(255,255,255,0.08)",
          border: "1.5px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.7)"
        }}>
                  {animatedSequence ? t("components.smart_math_tricks.quiz") : t("components.smart_math_tricks.try_it")}
                </button>
              </PremiumActionGate>}
              <PremiumActionGate gate={gate} label="Unlock progress saving">
                <button onClick={() => {
          onStar();
        }} className="px-3 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95" style={{
          background: starred ? "#fbbf2433" : "rgba(255,255,255,0.08)",
          border: `1.5px solid ${starred ? "hsl(var(--brand-amber-300))" : "rgba(255,255,255,0.12)"}`,
          color: starred ? "hsl(var(--brand-amber-300))" : "rgba(255,255,255,0.4)"
        }} title={t("components.smart_math_tricks.mark_as_mastered")}>
                {starred ? "⭐" : "☆"}
              </button>
              </PremiumActionGate>
            </div>}

          {/* Practice mini quiz */}
          {practiceMode && <div className="space-y-2.5 relative" style={{
        animation: "mt-appear 200ms ease both"
      }}>
              {floatKey > 0 && <FloatStars k={floatKey} />}
              <p className="text-white font-black text-sm text-center py-1">{trick.practiceQ.question}</p>
              <div className="grid grid-cols-2 gap-2">
                {trick.practiceQ.options.map(opt => {
            const isC = opt === trick.practiceQ.answer;
            const isSel = selected === opt;
            let bg = "rgba(255,255,255,0.07)";
            let border = "rgba(255,255,255,0.12)";
            let color = "white";
            let anim = "none";
            if (submitted) {
              if (isC) {
                bg = "rgba(34,197,94,0.2)";
                border = "hsl(var(--brand-green-500))";
                anim = "mt-correct 500ms ease both";
              } else if (isSel && !isC) {
                bg = "rgba(239,68,68,0.2)";
                border = "hsl(var(--brand-red-500))";
                anim = "mt-wrong 400ms ease both";
              } else {
                color = "rgba(255,255,255,0.25)";
                border = "rgba(255,255,255,0.06)";
              }
            } else if (isSel) {
              bg = `${trick.color}25`;
              border = trick.color;
            }
            return <button key={opt} disabled={submitted} onClick={() => setSelected(opt)} className="py-3 px-2 rounded-xl font-bold text-sm text-center transition-all active:scale-95 disabled:cursor-default" style={{
              background: bg,
              border: `1.5px solid ${border}`,
              color,
              animation: anim
            }}>{opt}</button>;
          })}
              </div>
              {!submitted ? <button onClick={handleSubmit} disabled={!selected} className="w-full py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-30" style={{
          background: `linear-gradient(135deg,${trick.color},${trick.color}cc)`
        }}>{t("components.smart_math_tricks.check")}</button> : <div>
                  <div className="rounded-xl px-3 py-2 text-center text-xs font-bold mb-2" style={{
            background: isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: isCorrect ? "hsl(var(--brand-green-400))" : "hsl(var(--brand-red-400))"
          }}>
                    {isCorrect ? `✅ Correct! ${trick.practiceQ.hint}` : `❌ Answer: ${trick.practiceQ.answer} — ${trick.practiceQ.hint}`}
                  </div>
                  <button onClick={resetPractice} className="w-full py-2 rounded-xl font-bold text-xs text-white/60 hover:text-white/80 transition-colors" style={{
            background: "rgba(255,255,255,0.06)"
          }}>
                    {t("components.smart_math_tricks.back_to_trick")}
                  </button>
                </div>}
            </div>}
        </div>}
    </div>;
}

// ─── Tab: Today's Tricks ──────────────────────────────────────────────────────

function TodayTab({
  pool,
  bonusTricks,
  childName,
  ageYears,
  childId,
  trickAge,
  starIds,
  mastery,
  adaptationProfile,
  parentInsights,
  onStar,
  onPracticeResult,
  onSignal,
  onSceneComplete,
  onBonusLoaded,
  gate,
}: {
  pool: MathTrick[];
  bonusTricks: MathTrick[];
  childName: string;
  ageYears: number;
  childId?: number;
  trickAge: TrickAge;
  starIds: string[];
  mastery: Record<string, TrickMastery>;
  adaptationProfile: AdaptationProfile;
  parentInsights: ParentInsight[];
  onStar(id: string): void;
  onPracticeResult(id: string, correct: boolean): void;
  onSignal(event: LearningSignalEvent): void;
  onSceneComplete(trickId: string, summary: SceneCompletionSummary): void;
  onBonusLoaded(tricks: MathTrick[]): void;
  gate: HubModuleActionGateState;
}) {
  const {
    t
  } = useTranslation();
  const [state] = useState(() => loadMathState(childName));
  const todayTricks = pickTodayTricks(pool, childName, state.seenIds, mastery, starIds);
  const [expanded, setExpanded] = useState<string | null>(todayTricks[0]?.id ?? null);
  return <div className="space-y-3">
      <p className="text-xs text-white/40 text-center">{t("components.smart_math_tricks.2_new_tricks_every_day")}</p>
      {parentInsights.length > 0 && (
        <ParentInsightCard
          insights={parentInsights}
          title={t("components.smart_math_tricks.parent_insights_title", "What your child is learning")}
          subtitle={t("components.smart_math_tricks.parent_insights_subtitle", "Based on how they think, not screen time.")}
        />
      )}
      {todayTricks.map((tr) => (
        <TrickCard
          key={tr.id}
          trick={tr}
          childName={childName}
          ageYears={ageYears}
          adaptationProfile={adaptationProfile}
          starred={starIds.includes(tr.id)}
          onStar={() => onStar(tr.id)}
          onPracticeResult={(correct) => onPracticeResult(tr.id, correct)}
          onSignal={onSignal}
          onSceneComplete={onSceneComplete}
          expanded={expanded === tr.id}
          onToggle={() => setExpanded((prev) => (prev === tr.id ? null : tr.id))}
          gate={gate}
          showPractice
        />
      ))}
      {bonusTricks.map((tr) => (
        <TrickCard
          key={tr.id}
          trick={tr}
          childName={childName}
          ageYears={ageYears}
          adaptationProfile={adaptationProfile}
          starred={starIds.includes(tr.id)}
          onStar={() => onStar(tr.id)}
          onPracticeResult={(correct) => onPracticeResult(tr.id, correct)}
          onSignal={onSignal}
          onSceneComplete={onSceneComplete}
          expanded={expanded === tr.id}
          onToggle={() => setExpanded((prev) => (prev === tr.id ? null : tr.id))}
          gate={gate}
          showPractice
        />
      ))}
      <PremiumActionGate gate={gate} label="Unlock more smart math tricks">
        <LearningLoadMoreButton
          section="smart_math_tricks"
          childId={childId}
          count={2}
          excludeIds={[...pool, ...bonusTricks].map((t) => t.id)}
          params={{ age: trickAge }}
          onLoaded={(items) => {
            const tricks = (items.tricks ?? []) as MathTrick[];
            if (tricks.length > 0) onBonusLoaded(tricks);
          }}
          className="pt-1"
        />
      </PremiumActionGate>
      <div className="text-center pt-1">
        <p className="text-[11px] text-white/30">{t("components.smart_math_tricks.new_tricks_unlock_tomorrow")}</p>
      </div>
    </div>;
}

// ─── Tab: Learn All ───────────────────────────────────────────────────────────

function LearnAllTab({
  pool,
  bonusTricks,
  childName,
  ageYears,
  childId,
  trickAge,
  starIds,
  adaptationProfile,
  onStar,
  onPracticeResult,
  onSignal,
  onSceneComplete,
  onBonusLoaded,
  gate,
}: {
  pool: MathTrick[];
  bonusTricks: MathTrick[];
  childName: string;
  ageYears: number;
  childId?: number;
  trickAge: TrickAge;
  starIds: string[];
  adaptationProfile: AdaptationProfile;
  onStar(id: string): void;
  onPracticeResult(id: string, correct: boolean): void;
  onSignal(event: LearningSignalEvent): void;
  onSceneComplete(trickId: string, summary: SceneCompletionSummary): void;
  onBonusLoaded(tricks: MathTrick[]): void;
  gate: HubModuleActionGateState;
}) {
  const {
    t
  } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const mastered = [...pool, ...bonusTricks].filter((t) => starIds.includes(t.id)).length;
  const allTricks = [...pool, ...bonusTricks];
  return <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-white/40">{allTricks.length} {t("components.smart_math_tricks.tricks_in_your_level")}</p>
        <p className="text-xs font-bold" style={{
        color: "hsl(var(--brand-amber-300))"
      }}>⭐ {mastered}/{allTricks.length} {t("components.smart_math_tricks.mastered")}</p>
      </div>
      {allTricks.map((tr) => (
        <TrickCard
          key={tr.id}
          trick={tr}
          childName={childName}
          ageYears={ageYears}
          adaptationProfile={adaptationProfile}
          starred={starIds.includes(tr.id)}
          onStar={() => onStar(tr.id)}
          onPracticeResult={(correct) => onPracticeResult(tr.id, correct)}
          onSignal={onSignal}
          onSceneComplete={onSceneComplete}
          expanded={expanded === tr.id}
          onToggle={() => setExpanded((prev) => (prev === tr.id ? null : tr.id))}
          gate={gate}
          showPractice
        />
      ))}
      <PremiumActionGate gate={gate} label="Unlock the full tricks library">
        <LearningLoadMoreButton
          section="smart_math_tricks"
          childId={childId}
          count={2}
          excludeIds={allTricks.map((t) => t.id)}
          params={{ age: trickAge }}
          onLoaded={(items) => {
            const tricks = (items.tricks ?? []) as MathTrick[];
            if (tricks.length > 0) onBonusLoaded(tricks);
          }}
        />
      </PremiumActionGate>
    </div>;
}

// ─── Tab: Practice ────────────────────────────────────────────────────────────

function PracticeTab({
  pool,
  childName,
  starIds,
  mastery,
  onStar,
  onPracticeResult,
  onSessionComplete,
}: {
  pool: MathTrick[];
  childName: string;
  starIds: string[];
  mastery: Record<string, TrickMastery>;
  onStar(id: string): void;
  onPracticeResult(id: string, correct: boolean): void;
  onSessionComplete(): void;
}) {
  const {
    t
  } = useTranslation();
  const SESSION_SIZE = Math.min(5, pool.length);
  const [sessionTricks] = useState(() => {
    const seed = dateSeed(todayStr() + childName + "practice");
    return pickTricksSpaced(pool, SESSION_SIZE, seed, mastery, starIds);
  });
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<(boolean | null)[]>(Array(SESSION_SIZE).fill(null));
  const [done, setDone] = useState(false);
  const [floatKey, setFloatKey] = useState(0);
  const {
    speak,
    pause
  } = useAmyVoice();
  const cur = sessionTricks[idx]!;

  // REMOVED auto speak on question change — user taps the speaker button.
  const handleSubmit = () => {
    if (!selected || submitted) return;
    pause();
    const isC = selected === cur.practiceQ.answer;
    setSubmitted(true);
    setResults(prev => {
      const n = [...prev];
      n[idx] = isC;
      return n;
    });
    onPracticeResult(cur.id, isC);
    if (isC) {
      setFloatKey((k) => k + 1);
      void speak("Correct! Well done!", { catalogPlayback: true });
      onStar(cur.id);
    } else {
      void speak(`The correct answer is ${cur.practiceQ.answer}. ${cur.practiceQ.hint}`);
    }
  };
  const handleNext = () => {
    pause();
    if (idx + 1 >= SESSION_SIZE) {
      setDone(true);
      onSessionComplete();
    } else {
      setIdx(i => i + 1);
      setSelected(null);
      setSubmitted(false);
    }
  };
  const handleRestart = () => {
    pause();
    setIdx(0);
    setSelected(null);
    setSubmitted(false);
    setResults(Array(SESSION_SIZE).fill(null));
    setDone(false);
  };
  if (done) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round(correct / SESSION_SIZE * 100);
    return <div className="text-center py-6 space-y-4" style={{
      animation: "mt-appear 300ms ease both"
    }}>
        <div style={{
        fontSize: 64,
        animation: "mt-pop 500ms cubic-bezier(0.34,1.56,0.64,1) both"
      }}>🏆</div>
        <p className="text-white font-black text-lg">{t("components.smart_math_tricks.practice_complete")}</p>
        <div className="flex justify-center gap-1.5">
          {results.map((r, i) => <span key={i} style={{
          fontSize: 24,
          animation: `mt-pop 400ms ${i * 80}ms ease both`
        }}>{r ? "⭐" : "💔"}</span>)}
        </div>
        <div className="rounded-2xl px-6 py-3 inline-block font-black text-2xl" style={{
        background: "rgba(255,255,255,0.1)",
        color: pct === 100 ? "hsl(var(--brand-amber-300))" : "#94a3b8"
      }}>
          {correct}/{SESSION_SIZE} ⭐
        </div>
        <p className="text-white/40 text-xs">
          {pct === 100
            ? t("components.smart_math_tricks.perfect_score")
            : pct >= 60
              ? t("components.smart_math_tricks.good_score")
              : t("components.smart_math_tricks.keep_going")}
        </p>
        <button onClick={handleRestart} className="w-full max-w-xs py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95" style={{
        background: "linear-gradient(135deg,hsl(var(--brand-amber-500)),hsl(var(--brand-amber-300)))"
      }}>
          {t("components.smart_math_tricks.try_again")}
        </button>
      </div>;
  }
  const isCorrect = submitted && selected === cur.practiceQ.answer;
  const isWrong = submitted && selected !== cur.practiceQ.answer;
  return <div className="space-y-3 relative">
      {floatKey > 0 && <FloatStars k={floatKey} />}

      {/* Progress */}
      <div className="flex items-center justify-center gap-1.5">
        {results.map((r, i) => <span key={i} style={{
        fontSize: 16
      }}>
            {r === true ? "⭐" : r === false ? "💔" : i === idx ? "👉" : "○"}
          </span>)}
      </div>

      {/* Question */}
      <div className="rounded-2xl px-4 py-4 text-center" key={idx} style={{
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      animation: "mt-appear 280ms ease both"
    }}>
        <p className="text-white/40 text-[11px] font-bold mb-2">Q {idx + 1} of {SESSION_SIZE}</p>
        <p className="text-white font-black text-base leading-snug">{cur.practiceQ.question}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {cur.practiceQ.options.map(opt => {
        const isC = opt === cur.practiceQ.answer;
        const isSel = selected === opt;
        let bg = "rgba(255,255,255,0.07)";
        let border = "rgba(255,255,255,0.12)";
        let color = "white";
        let anim = "none";
        if (submitted) {
          if (isC) {
            bg = "rgba(34,197,94,0.2)";
            border = "hsl(var(--brand-green-500))";
            anim = "mt-correct 500ms ease both";
          } else if (isSel) {
            bg = "rgba(239,68,68,0.2)";
            border = "hsl(var(--brand-red-500))";
            anim = "mt-wrong 400ms ease both";
          } else {
            color = "rgba(255,255,255,0.25)";
            border = "rgba(255,255,255,0.06)";
          }
        } else if (isSel) {
          bg = "rgba(245,158,11,0.2)";
          border = "hsl(var(--brand-amber-500))";
        }
        return <button key={opt} disabled={submitted} onClick={() => setSelected(opt)} className="py-3.5 px-2 rounded-xl font-black text-sm text-center transition-all active:scale-95 disabled:cursor-default" style={{
          background: bg,
          border: `2px solid ${border}`,
          color,
          animation: anim
        }}>{opt}</button>;
      })}
      </div>

      {/* Feedback */}
      {submitted && <div className="rounded-xl px-4 py-2.5 text-center text-xs font-bold" style={{
      animation: "mt-appear 200ms ease both",
      background: isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
      color: isCorrect ? "hsl(var(--brand-green-400))" : "hsl(var(--brand-red-400))"
    }}>
          {isCorrect ? `✅ ${cur.practiceQ.hint}` : `❌ Correct: ${cur.practiceQ.answer} — ${cur.practiceQ.hint}`}
        </div>}

      {/* Trick reveal after submit */}
      {submitted && <div className="rounded-xl px-3 py-2.5 text-center text-xs" style={{
      background: `${cur.color}15`,
      border: `1px solid ${cur.color}33`,
      color: cur.color
    }}>
          <span style={{
        fontSize: 16
      }}>{cur.emoji}</span> <strong>{cur.title}:</strong> {cur.trick}
        </div>}

      {/* Action */}
      {!submitted ? <button onClick={handleSubmit} disabled={!selected} className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-30" style={{
      background: "linear-gradient(135deg,hsl(var(--brand-amber-500)),hsl(var(--brand-amber-300)))"
    }}>
          {t("components.smart_math_tricks.check_answer")}
        </button> : <button onClick={handleNext} className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95" style={{
      background: idx + 1 >= SESSION_SIZE ? "linear-gradient(135deg,hsl(var(--brand-amber-500)),hsl(var(--brand-amber-300)))" : "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-violet-500)))"
    }}>
          {idx + 1 >= SESSION_SIZE ? "🏆 See Results!" : "Next →"}
        </button>}
    </div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "today" | "learn" | "practice" | "playground";
interface SmartMathTricksProps {
  childName: string;
  ageYears: number;
  childId?: number;
  gate?: HubModuleActionGateState;
}
export function SmartMathTricks({
  childName,
  ageYears,
  childId,
  gate,
}: SmartMathTricksProps) {
  const {
    t
  } = useTranslation();
  const authFetch = useAuthFetch();
  const actionGate = gate ?? {
    locked: false,
    previewMode: false,
    onEngage: () => undefined,
    module: "hub_smart_math_tricks",
    entitlementState: "premium" as const,
  };
  // Ages 2–8 (2+ in months via page shell)
  if (ageYears < 2 || ageYears > 8) return null;
  const trickAge: TrickAge = ageYears <= 6 ? "4-6" : "6-8";
  const pool = TRICKS.filter(t => t.age === trickAge);
  const [bonusTricks, setBonusTricks] = useState<MathTrick[]>([]);
  const fullPool = useMemo(() => [...pool, ...bonusTricks], [pool, bonusTricks]);

  useEffect(() => {
    const texts = fullPool.flatMap((trick) => [
      trick.audioText,
      trick.trick,
      trick.practiceQ.question,
      trick.practiceQ.hint,
    ]);
    scheduleLearningZoneAudioPrewarm(authFetch, {
      module: "smart_math_tricks",
      texts,
      sequenceTexts: fullPool.map((t) => t.audioText),
      ageGroup: trickAge,
      stateKey: buildLearningZoneAudioStateKey({
        module: "smart_math_tricks",
        ageGroup: trickAge,
        revision: fullPool.length,
      }),
    });
  }, [authFetch, fullPool, trickAge]);

  const [tab, setTab] = useState<Tab>("today");
  const [mathSt, setMathSt] = useState(() => loadMathState(childName));
  const persistState = useCallback(
    (updater: (prev: MathState) => MathState) => {
      setMathSt((prev) => {
        const next = updater(prev);
        saveMathState(childName, next);
        return next;
      });
    },
    [childName],
  );

  // ── Adaptive learning intelligence (Phase 4) ───────────────────────────────
  const [signals, setSignals] = useState<ChildLearningSignals>(() =>
    createLearningSignals(ageYears),
  );
  const adaptationProfile: AdaptationProfile = useMemo(
    () => deriveAdaptationProfile(signals, ageYears),
    [signals, ageYears],
  );
  const recordSignal = useCallback((event: LearningSignalEvent) => {
    setSignals((prev) => applyLearningSignal(prev, event));
  }, []);
  const recordCognition = useCallback(
    (event: LearningSessionEvent) => {
      persistState((prev) => ({
        ...prev,
        cognition: [...(prev.cognition ?? []), event].slice(-40),
      }));
    },
    [persistState],
  );

  // ── Parent cognition insights (Phase 8) ─────────────────────────────────────
  const parentInsights: ParentInsight[] = useMemo(
    () => buildParentInsights(mathSt.cognition ?? [], childName),
    [mathSt.cognition, childName],
  );

  const handleStar = useCallback(
    (id: string) => {
      persistState((prev) => {
        const starIds = prev.starIds.includes(id)
          ? prev.starIds.filter((s) => s !== id)
          : [...prev.starIds, id];
        const seenIds = prev.seenIds.includes(id) ? prev.seenIds : [...prev.seenIds, id];
        return recordStreakDay({ ...prev, starIds, seenIds });
      });
    },
    [persistState],
  );

  const handlePracticeResult = useCallback(
    (id: string, correct: boolean) => {
      persistState((prev) => ({
        ...prev,
        mastery: bumpMastery(prev.mastery, id, correct),
      }));
      recordSignal({ type: correct ? "correct" : "incorrect" });
      const { operation, strategy } = trickStrategy(id);
      recordCognition({
        trickId: id,
        operation,
        strategy,
        solvedVisually: false,
        usedThinkingReplay: false,
        abstractionLevel: adaptationProfile.abstractionLevel,
        correct,
        at: Date.now(),
      });
    },
    [persistState, recordSignal, recordCognition, adaptationProfile.abstractionLevel],
  );

  /** A visual scene finished — log the cognitive milestone (Phase 8). */
  const handleSceneComplete = useCallback(
    (trickId: string, summary: SceneCompletionSummary) => {
      recordCognition({
        trickId,
        operation: trickStrategy(trickId).operation,
        strategy: summary.strategy,
        solvedVisually: true,
        usedThinkingReplay: summary.usedThinkingReplay,
        abstractionLevel: summary.abstractionLevel,
        at: Date.now(),
      });
    },
    [recordCognition],
  );

  const handleSessionComplete = useCallback(() => {
    persistState((prev) => recordStreakDay(prev));
  }, [persistState]);

  const handleBonusLoaded = useCallback((tricks: MathTrick[]) => {
    setBonusTricks((prev) => [...prev, ...tricks]);
    const texts = tricks.flatMap((trick) => [trick.audioText, trick.trick, trick.practiceQ.question]);
    scheduleLearningZoneAudioPrewarm(authFetch, {
      module: "smart_math_tricks",
      texts,
      sequenceTexts: texts,
      ageGroup: trickAge,
      stateKey: buildLearningZoneAudioStateKey({
        module: "smart_math_tricks",
        ageGroup: trickAge,
        revision: `bonus-${Date.now()}`,
      }),
    });
  }, [authFetch, trickAge]);

  const tabs: { key: Tab; labelKey: string; icon: string }[] = [
    { key: "today", labelKey: "tab_today", icon: "📅" },
    { key: "learn", labelKey: "tab_learn", icon: "📚" },
    { key: "practice", labelKey: "tab_practice", icon: "✏️" },
    { key: "playground", labelKey: "tab_playground", icon: "🎮" },
  ];
  return <div className="rounded-3xl overflow-hidden" style={{
    background: "linear-gradient(160deg,#451a03 0%,#1c0a00 100%)"
  }}>
      <style>{MATH_STYLES}</style>

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-black text-base leading-tight">{t("components.smart_math_tricks.smart_math_tricks")}</p>
            <p className="text-white/40 text-[11px] mt-0.5">
              {trickAge === "4-6"
                ? t("components.smart_math_tricks.subtitle_young")
                : t("components.smart_math_tricks.subtitle_older")}{" "}
              {t("components.smart_math_tricks.age")} {trickAge}
            </p>
          </div>
          <div className="text-right">
            {mathSt.streakDays > 0 && (
              <p className="text-[10px] font-bold mb-0.5" style={{ color: "hsl(var(--brand-amber-300))" }}>
                🔥 {mathSt.streakDays} {t("components.smart_math_tricks.day_streak")}
              </p>
            )}
            <p className="text-[11px] font-bold" style={{
            color: "hsl(var(--brand-amber-300))"
          }}>⭐ {mathSt.starIds.length}</p>
            <p className="text-[10px] text-white/30">{t("components.smart_math_tricks.mastered_2")}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{
        background: "rgba(255,255,255,0.07)"
      }}>
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              data-testid={`smt-tab-${tabItem.key}`}
              onClick={() => setTab(tabItem.key)}
              className="flex-1 py-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all active:scale-95"
              style={{
                background: tab === tabItem.key ? "rgba(245,158,11,0.3)" : "transparent",
                color: tab === tabItem.key ? "hsl(var(--brand-amber-300))" : "rgba(255,255,255,0.4)",
                border:
                  tab === tabItem.key ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
              }}
            >
              {tabItem.icon} {t(`components.smart_math_tricks.${tabItem.labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pb-4">
        {tab === "today" && (
          <TodayTab
            pool={pool}
            bonusTricks={bonusTricks}
            childName={childName}
            ageYears={ageYears}
            childId={childId}
            trickAge={trickAge}
            starIds={mathSt.starIds}
            mastery={mathSt.mastery}
            adaptationProfile={adaptationProfile}
            parentInsights={parentInsights}
            onStar={handleStar}
            onPracticeResult={handlePracticeResult}
            onSignal={recordSignal}
            onSceneComplete={handleSceneComplete}
            onBonusLoaded={handleBonusLoaded}
            gate={actionGate}
          />
        )}
        {tab === "learn" && (
          <LearnAllTab
            pool={pool}
            bonusTricks={bonusTricks}
            childName={childName}
            ageYears={ageYears}
            childId={childId}
            trickAge={trickAge}
            starIds={mathSt.starIds}
            adaptationProfile={adaptationProfile}
            onStar={handleStar}
            onPracticeResult={handlePracticeResult}
            onSignal={recordSignal}
            onSceneComplete={handleSceneComplete}
            onBonusLoaded={handleBonusLoaded}
            gate={actionGate}
          />
        )}
        {tab === "practice" && (
          <PremiumActionGate gate={actionGate} label="Unlock smart math practice sessions">
            <PracticeTab
              pool={fullPool}
              childName={childName}
              starIds={mathSt.starIds}
              mastery={mathSt.mastery}
              onStar={handleStar}
              onPracticeResult={handlePracticeResult}
              onSessionComplete={handleSessionComplete}
            />
          </PremiumActionGate>
        )}
        {tab === "playground" && (
          <PremiumActionGate gate={actionGate} label="Unlock math playground">
            <MathPlayground childName={childName} ageYears={ageYears} childId={childId} />
          </PremiumActionGate>
        )}
      </div>
    </div>;
}