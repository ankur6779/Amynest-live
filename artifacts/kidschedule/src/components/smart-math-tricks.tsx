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
import {
  LivingMathWorld,
  CinematicEntry,
  HeroLessonStage,
  TrickHeroVisual,
  AmyMathCompanion,
  MagicCelebration,
  worldForTrick,
  MATH_WORLDS,
  buildAtmosphere,
  loadWorldMemory,
  recordWorldGrowth,
  personalityForTheme,
  type PathNode,
  type WorldMemory,
  type Atmosphere,
  type CompanionEmotion,
  type PresenceMode,
  type AmbienceIntensity,
} from "@/components/smart-math-visual";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, PRESS_FEEDBACK } from "@/lib/experience-system";

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
  k,
  color,
}: {
  k: number;
  color?: string;
}) {
  return <MagicCelebration active={k > 0} burstKey={k} color={color} />;
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
  const world = worldForTrick(trick);
  return <motion.div
    layout
    className="overflow-hidden rounded-[1.35rem]"
    style={{
      // Organic world platform — blends into environment, not a dashboard card
      background: expanded
        ? `linear-gradient(165deg, ${world.sky[0]}cc, rgba(255,255,255,0.04) 70%)`
        : "linear-gradient(165deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
      border: `1px solid ${expanded ? `${world.accent}40` : "rgba(255,255,255,0.08)"}`,
      boxShadow: expanded
        ? `0 16px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 24px ${world.glow}`
        : "inset 0 1px 0 rgba(255,255,255,0.06)",
    }}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={TRANSITION.springGentle}
    whileHover={{ y: -1 }}
  >
      {/* Card header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${PRESS_FEEDBACK}`}
      >
        <span
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl"
          style={{
            background: `linear-gradient(145deg, ${world.accent}55, ${trick.color}33)`,
            boxShadow: `0 4px 14px ${world.glow}`,
          }}
        >
          {trick.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm leading-tight">{trick.title}</p>
          <p className="text-[11px] mt-0.5 truncate" style={{
          color: "rgba(255,255,255,0.45)"
        }}>{trick.trick}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {starred && (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black"
              style={{ background: "rgba(251,191,36,0.25)", color: "hsl(var(--brand-amber-300))" }}
            >
              ★
            </span>
          )}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={TRANSITION.micro}
            style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}
          >
            ▾
          </motion.span>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
      {expanded && <motion.div
        className="space-y-3 px-4 pb-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={TRANSITION.warm}
      >
          {/* Ambient living hero — every trick */}
          {!interactiveMode && <TrickHeroVisual trick={trick} size="card" />}

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
              {floatKey > 0 && <FloatStars k={floatKey} color={trick.color} />}
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
        </motion.div>}
      </AnimatePresence>
    </motion.div>;
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
  onImmerse,
  onWorldGrowth,
  onLessonFocus,
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
  onImmerse?: () => void;
  onWorldGrowth?: (kind: "star" | "correct" | "lesson_open") => void;
  onLessonFocus?: (focused: boolean) => void;
}) {
  const {
    t
  } = useTranslation();
  const [state] = useState(() => loadMathState(childName));
  const todayTricks = pickTodayTricks(pool, childName, state.seenIds, mastery, starIds);
  const heroTrick = todayTricks[0];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [heroReady, setHeroReady] = useState(true);
  const detailRef = useRef<HTMLDivElement>(null);

  const progressNodes: PathNode[] = useMemo(
    () =>
      todayTricks.map((tr, i) => ({
        id: tr.id,
        label: tr.title,
        state: starIds.includes(tr.id)
          ? ("completed" as const)
          : i === 0
            ? ("today" as const)
            : ("future" as const),
      })),
    [todayTricks, starIds],
  );

  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  const openHeroTrick = useCallback(() => {
    if (!heroTrick) return;
    onWorldGrowth?.("lesson_open");
    setExpanded(heroTrick.id);
    if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [heroTrick, onWorldGrowth]);

  // Soft reveal after cinematic (parent may flip heroReady)
  useEffect(() => {
    setHeroReady(true);
  }, []);

  // Protect learning focus — hush world while a trick is open
  useEffect(() => {
    onLessonFocus?.(expanded != null);
    return () => onLessonFocus?.(false);
  }, [expanded, onLessonFocus]);

  return <div className="space-y-5">
      {heroTrick && (
        <HeroLessonStage
          trick={heroTrick}
          childName={childName}
          progressNodes={progressNodes}
          ctaLabel={t("components.smart_math_tricks.try_it", "Try it")}
          onCta={openHeroTrick}
          onImmerse={onImmerse}
          ready={heroReady}
        />
      )}

      {/* Below the fold — full lesson tools preserved */}
      <div ref={detailRef} className="space-y-3 pt-1">
        <p className="text-center text-[11px] font-bold tracking-wide text-white/30">
          {t("components.smart_math_tricks.2_new_tricks_every_day")}
        </p>
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
  onLessonFocus,
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
  onLessonFocus?: (focused: boolean) => void;
}) {
  const {
    t
  } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const mastered = [...pool, ...bonusTricks].filter((t) => starIds.includes(t.id)).length;
  const allTricks = [...pool, ...bonusTricks];

  useEffect(() => {
    onLessonFocus?.(expanded != null);
    return () => onLessonFocus?.(false);
  }, [expanded, onLessonFocus]);

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
    return <div className="relative space-y-4 overflow-hidden py-6 text-center" style={{
      animation: "mt-appear 300ms ease both"
    }}>
        <MagicCelebration active burstKey={1} color="hsl(var(--brand-amber-300))" />
        <motion.div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black"
          style={{
            background: "linear-gradient(145deg, hsl(var(--brand-amber-300)), #f59e0b)",
            color: "#1c0a00",
            boxShadow: "0 0 32px rgba(251,191,36,0.45)",
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={TRANSITION.spring}
        >
          ★
        </motion.div>
        <p className="text-white font-black text-lg">{t("components.smart_math_tricks.practice_complete")}</p>
        <div className="flex justify-center gap-1.5">
          {results.map((r, i) => <span key={i} style={{
          fontSize: 22,
          animation: `mt-pop 400ms ${i * 80}ms ease both`,
          color: r ? "hsl(var(--brand-amber-300))" : "rgba(255,255,255,0.25)",
        }}>{r ? "★" : "○"}</span>)}
        </div>
        <div className="rounded-2xl px-6 py-3 inline-block font-black text-2xl" style={{
        background: "rgba(255,255,255,0.1)",
        color: pct === 100 ? "hsl(var(--brand-amber-300))" : "#94a3b8"
      }}>
          {correct}/{SESSION_SIZE}
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
      {floatKey > 0 && <FloatStars k={floatKey} color={cur.color} />}

      {/* Progress */}
      <div className="flex items-center justify-center gap-1.5">
        {results.map((r, i) => <span key={i} style={{
        fontSize: 16
      }}>
            {r === true ? "★" : r === false ? "✕" : i === idx ? "●" : "○"}
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

  const tabs: { key: Tab; labelKey: string; mark: string }[] = [
    { key: "today", labelKey: "tab_today", mark: "●" },
    { key: "learn", labelKey: "tab_learn", mark: "◆" },
    { key: "practice", labelKey: "tab_practice", mark: "▲" },
    { key: "playground", labelKey: "tab_playground", mark: "✦" },
  ];

  const introKey = "amynest_smt_cinematic_v1";
  const [showIntro, setShowIntro] = useState(() => {
    try {
      if (typeof sessionStorage === "undefined") return true;
      return sessionStorage.getItem(introKey) !== "1";
    } catch {
      return true;
    }
  });
  const [worldReady, setWorldReady] = useState(!showIntro);
  const [amyMood, setAmyMood] = useState<"idle" | "wave" | "celebrate">("idle");
  const [worldMemory, setWorldMemory] = useState<WorldMemory>(() => loadWorldMemory(childName));
  const [atmosphere] = useState<Atmosphere>(() => buildAtmosphere(childName));
  const [immersed, setImmersed] = useState(false);
  const [worldCelebrate, setWorldCelebrate] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [presenceMode, setPresenceMode] = useState<PresenceMode>("settling");
  const [visualWinStreak, setVisualWinStreak] = useState(0);
  const [returningWelcome, setReturningWelcome] = useState(false);
  const [lessonFocus, setLessonFocus] = useState(false);
  const moodTimerRef = useRef<number | null>(null);
  const welcomeTimerRef = useRef<number | null>(null);
  const immerseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (moodTimerRef.current != null) {
        window.clearTimeout(moodTimerRef.current);
        moodTimerRef.current = null;
      }
      if (welcomeTimerRef.current != null) {
        window.clearTimeout(welcomeTimerRef.current);
        welcomeTimerRef.current = null;
      }
      if (immerseTimerRef.current != null) {
        window.clearTimeout(immerseTimerRef.current);
        immerseTimerRef.current = null;
      }
    };
  }, []);

  const ambience: AmbienceIntensity =
    tab === "practice" || immersed || lessonFocus
      ? "focus"
      : tab === "learn"
        ? "soft"
        : "rest";

  // Visual visit memory — does not touch learning progression
  useEffect(() => {
    const prev = loadWorldMemory(childName);
    const next = recordWorldGrowth(childName, "visit");
    setWorldMemory(next);
    // Happy to see them again — body language only
    if (prev.visitCount >= 1 || prev.starsIgnited > 0 || prev.blooms > 0) {
      setReturningWelcome(true);
      if (welcomeTimerRef.current != null) window.clearTimeout(welcomeTimerRef.current);
      welcomeTimerRef.current = window.setTimeout(() => {
        setReturningWelcome(false);
        welcomeTimerRef.current = null;
      }, 8000);
    }
  }, [childName]);

  const todayPreview = useMemo(
    () => pickTodayTricks(pool, childName, mathSt.seenIds, mathSt.mastery, mathSt.starIds)[0],
    [pool, childName, mathSt.seenIds, mathSt.mastery, mathSt.starIds],
  );
  const worldTheme = todayPreview ? worldForTrick(todayPreview) : MATH_WORLDS.sunny_meadow;
  const worldPersonality = useMemo(() => personalityForTheme(worldTheme), [worldTheme]);

  const amyEmotion: CompanionEmotion = useMemo(() => {
    if (visualWinStreak >= 2) return "excited";
    if (returningWelcome) return "welcome";
    if (presenceMode === "idle" || presenceMode === "settling") return "patient";
    return "calm";
  }, [visualWinStreak, returningWelcome, presenceMode]);

  const handlePresenceChange = useCallback((mode: PresenceMode) => {
    setPresenceMode(mode);
  }, []);

  const pulseWorldCelebrate = useCallback(() => {
    setWorldCelebrate(true);
    setAmyMood("celebrate");
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current);
    moodTimerRef.current = window.setTimeout(() => {
      setWorldCelebrate(false);
      setAmyMood("idle");
      moodTimerRef.current = null;
    }, 2200);
  }, []);

  const handleWorldGrowth = useCallback(
    (kind: "star" | "correct" | "lesson_open") => {
      setWorldMemory(recordWorldGrowth(childName, kind));
      if (kind === "correct") pulseWorldCelebrate();
    },
    [childName, pulseWorldCelebrate],
  );

  const handleStarVisual = useCallback(
    (id: string) => {
      const adding = !mathSt.starIds.includes(id);
      handleStar(id);
      if (adding) handleWorldGrowth("star");
    },
    [handleStar, handleWorldGrowth, mathSt.starIds],
  );

  const handlePracticeResultVisual = useCallback(
    (id: string, correct: boolean) => {
      handlePracticeResult(id, correct);
      if (correct) {
        setVisualWinStreak((n) => n + 1);
        handleWorldGrowth("correct");
      } else {
        setVisualWinStreak(0);
      }
    },
    [handlePracticeResult, handleWorldGrowth],
  );

  const handleSessionCompleteVisual = useCallback(() => {
    handleSessionComplete();
    pulseWorldCelebrate();
  }, [handleSessionComplete, pulseWorldCelebrate]);

  const handleImmerse = useCallback(() => {
    setImmersed(true);
    if (immerseTimerRef.current != null) window.clearTimeout(immerseTimerRef.current);
    immerseTimerRef.current = window.setTimeout(() => {
      setImmersed(false);
      immerseTimerRef.current = null;
    }, 1400);
  }, []);

  const finishIntro = useCallback(() => {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(introKey, "1");
      }
    } catch {
      /* ignore */
    }
    setShowIntro(false);
    setWorldReady(true);
    setAmyMood("wave");
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current);
    moodTimerRef.current = window.setTimeout(() => {
      setAmyMood("idle");
      moodTimerRef.current = null;
    }, 1600);
  }, []);

  return (
    <LivingMathWorld
      theme={worldTheme}
      className="relative min-h-[420px]"
      atmosphere={atmosphere}
      memory={worldMemory}
      celebrate={worldCelebrate}
      immersed={immersed}
      ambience={ambience}
      onPointerChange={setPointer}
      onPresenceChange={handlePresenceChange}
    >
      <style>{MATH_STYLES}</style>

      <AnimatePresence>
        {showIntro && (
          <CinematicEntry
            theme={worldTheme}
            equationHint={todayPreview?.example}
            onComplete={finishIntro}
          />
        )}
      </AnimatePresence>

      {worldReady && (
        <AmyMathCompanion
          mood={amyMood}
          greetOnMount
          lookAt={pointer}
          pointHint={tab === "today"}
          emotion={amyEmotion}
          tempo={worldPersonality.amyTempo}
        />
      )}

      {/* Header — soft glass, secondary to hero */}
      <div
        className="relative z-10 px-4 pb-3 pt-4"
        style={{
          opacity: worldReady ? 1 : 0,
          pointerEvents: worldReady ? "auto" : "none",
          transition: "opacity 400ms ease",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-base font-black leading-tight text-white">
              {t("components.smart_math_tricks.smart_math_tricks")}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {trickAge === "4-6"
                ? t("components.smart_math_tricks.subtitle_young")
                : t("components.smart_math_tricks.subtitle_older")}{" "}
              {t("components.smart_math_tricks.age")} {trickAge}
            </p>
          </div>
          <div className="text-right">
            {mathSt.streakDays > 0 && (
              <p
                className="mb-0.5 text-[10px] font-bold"
                style={{ color: "hsl(var(--brand-amber-300))" }}
              >
                {mathSt.streakDays} {t("components.smart_math_tricks.day_streak")}
              </p>
            )}
            <p
              className="text-[11px] font-bold"
              style={{ color: "hsl(var(--brand-amber-300))" }}
            >
              ★ {mathSt.starIds.length}
            </p>
            <p className="text-[10px] text-white/30">
              {t("components.smart_math_tricks.mastered_2")}
            </p>
          </div>
        </div>

        {/* Tab bar — soft world shelf, not a settings control */}
        <div
          className="flex gap-1 rounded-full p-1"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(14px)",
          }}
        >
          {tabs.map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <motion.button
                key={tabItem.key}
                type="button"
                data-testid={`smt-tab-${tabItem.key}`}
                onClick={() => setTab(tabItem.key)}
                className={`flex-1 rounded-full py-2 text-[10px] font-bold sm:text-xs ${PRESS_FEEDBACK}`}
                style={{
                  background: active
                    ? `linear-gradient(145deg, ${worldTheme.accent}44, ${worldTheme.accent}22)`
                    : "transparent",
                  color: active ? worldTheme.accent : "rgba(255,255,255,0.4)",
                  border: active
                    ? `1px solid ${worldTheme.accent}55`
                    : "1px solid transparent",
                  boxShadow: active ? `0 0 16px ${worldTheme.glow}` : undefined,
                }}
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -1 }}
              >
                <span className="mr-1 opacity-70">{tabItem.mark}</span>
                {t(`components.smart_math_tricks.${tabItem.labelKey}`)}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div
        className="relative z-10 px-4 pb-14"
        style={{ opacity: worldReady ? 1 : 0, transition: "opacity 400ms ease" }}
      >
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
            onStar={handleStarVisual}
            onPracticeResult={handlePracticeResultVisual}
            onSignal={recordSignal}
            onSceneComplete={handleSceneComplete}
            onBonusLoaded={handleBonusLoaded}
            gate={actionGate}
            onImmerse={handleImmerse}
            onWorldGrowth={handleWorldGrowth}
            onLessonFocus={setLessonFocus}
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
            onStar={handleStarVisual}
            onPracticeResult={handlePracticeResultVisual}
            onSignal={recordSignal}
            onSceneComplete={handleSceneComplete}
            onBonusLoaded={handleBonusLoaded}
            gate={actionGate}
            onLessonFocus={setLessonFocus}
          />
        )}
        {tab === "practice" && (
          <PremiumActionGate gate={actionGate} label="Unlock smart math practice sessions">
            <PracticeTab
              pool={fullPool}
              childName={childName}
              starIds={mathSt.starIds}
              mastery={mathSt.mastery}
              onStar={handleStarVisual}
              onPracticeResult={handlePracticeResultVisual}
              onSessionComplete={handleSessionCompleteVisual}
            />
          </PremiumActionGate>
        )}
        {tab === "playground" && (
          <PremiumActionGate gate={actionGate} label="Unlock math playground">
            <MathPlayground childName={childName} ageYears={ageYears} childId={childId} />
          </PremiumActionGate>
        )}
      </div>
    </LivingMathWorld>
  );
}