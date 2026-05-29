import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  deriveSnapshots,
  type AdaptationProfile,
  type LearningSignalEvent,
  type MathStrategy,
  type SceneContainer,
  type SceneObject,
  type VisualMathSequence,
} from "@workspace/math-tricks";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import { audioManager } from "@/lib/audio-manager";
import { preloadStaticPhrases, primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { GroupContainer } from "./GroupContainer";
import { DistributionContainer } from "./DistributionContainer";
import { CountingAnimator } from "./CountingAnimator";
import { EquationMorph } from "./EquationMorph";
import { InsightLayer } from "./InsightLayer";
import { CelebrationLayer } from "./CelebrationLayer";
import { StepNarrator } from "./StepNarrator";
import { MATH_ANIM_KEYFRAMES } from "./keyframes";

/** Summary emitted once the sequence finishes — feeds parent cognition insights. */
export interface SceneCompletionSummary {
  strategy?: MathStrategy;
  usedThinkingReplay: boolean;
  abstractionLevel: number;
}

export interface AnimatedMathSceneProps {
  sequence: VisualMathSequence;
  /** Child age in years — controls pacing and symbolic scaffolding. */
  ageYears: number;
  /** Trick accent colour (CSS colour string). */
  accentColor?: string;
  /** Begin playing automatically on mount. */
  autoPlay?: boolean;
  /** Live adaptation profile (Phase 4) — adjusts pacing / scaffolding. */
  adaptationProfile?: Partial<AdaptationProfile>;
  /** Emit interaction signals back up for adaptive learning. */
  onSignal?: (event: LearningSignalEvent) => void;
  /** Fired once when the final step is reached. */
  onComplete?: (summary: SceneCompletionSummary) => void;
}

/** Per-age base step pacing. Younger children get slower, calmer transitions. */
function baseStepDurationMs(ageYears: number): number {
  if (ageYears <= 4) return 2600;
  if (ageYears <= 6) return 1900;
  return 1350;
}

function groupObjects(objects: SceneObject[]): Map<string, SceneObject[]> {
  const map = new Map<string, SceneObject[]>();
  for (const o of objects) {
    const arr = map.get(o.container);
    if (arr) arr.push(o);
    else map.set(o.container, [o]);
  }
  return map;
}

/**
 * AnimatedMathScene — the renderer for a config-driven visual-math sequence.
 *
 * It interprets the sequence into per-step snapshots once, then animates the
 * diff between consecutive snapshots. Beyond the concrete objects it now layers
 * in cognition: a thinking-insight overlay (Phase 1), semantic equation morphing
 * (Phase 2), emotional praise (Phase 3), adaptive pacing/scaffolding (Phase 4)
 * and a Replay-Thinking mode (Phase 6) — all calm, accessible and reduced-motion
 * aware.
 */
export function AnimatedMathScene({
  sequence,
  ageYears,
  accentColor,
  autoPlay = false,
  adaptationProfile,
  onSignal,
  onComplete,
}: AnimatedMathSceneProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const { speak, pause, speaking, loading } = useAmyVoice();

  const snapshots = useMemo(() => deriveSnapshots(sequence), [sequence]);
  const lastIndex = snapshots.length - 1;
  const meta = sequence.meta;

  const narrationLines = useMemo(() => {
    const set = new Set<string>();
    for (const s of snapshots) {
      const a = s.narration?.trim();
      const b = s.thinkingNarration?.trim();
      if (a) set.add(a);
      if (b) set.add(b);
    }
    return [...set];
  }, [snapshots]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const completedRef = useRef(false);
  const usedThinkingRef = useRef(false);

  // ── Adaptive scaffolding (Phase 4) ──────────────────────────────────────────
  const abstraction =
    adaptationProfile?.abstractionLevel ?? (ageYears >= 7 ? 0.8 : ageYears >= 5 ? 0.5 : 0.1);
  const durationScale = adaptationProfile?.stepDurationScale ?? 1;
  // Thinking mode always shows the symbolic bridge so the reasoning is explicit.
  const showEquation = abstraction >= 0.35 || thinkingMode;

  const accent = accentColor ?? "hsl(var(--brand-amber-400))";
  const snapshot = snapshots[step] ?? snapshots[0];
  const finished = step >= lastIndex && !playing;

  const stepDuration = useMemo(() => {
    const base = baseStepDurationMs(ageYears) * durationScale * (thinkingMode ? 1.5 : 1);
    return reduced ? base * 0.5 : base;
  }, [ageYears, durationScale, thinkingMode, reduced]);

  // ── Autoplay ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    if (step >= lastIndex) {
      setPlaying(false);
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.({
          strategy: meta?.strategy,
          usedThinkingReplay: usedThinkingRef.current,
          abstractionLevel: abstraction,
        });
      }
      return;
    }
    const id = window.setTimeout(() => setStep((s) => Math.min(s + 1, lastIndex)), stepDuration);
    return () => window.clearTimeout(id);
  }, [playing, step, lastIndex, stepDuration, onComplete, meta, abstraction]);

  // ── Pre-warm this section's narration audio (fetch-only CDN warm) ───────────
  useEffect(() => {
    if (narrationLines.length === 0) return;
    preloadStaticPhrases(narrationLines, "default", narrationLines.length);
  }, [narrationLines]);

  // ── Voice narration synced to the active step ───────────────────────────────
  useEffect(() => {
    if (!voiceEnabled) return;
    const line = (thinkingMode ? snapshot?.thinkingNarration : snapshot?.narration)?.trim();
    if (!line) return;
    void speak(line, { catalogPlayback: true, staticCatalogTexts: [line] });
    // Speak only when the step (or mode) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, voiceEnabled, thinkingMode]);

  // Stop narration when the scene unmounts (controller singleton — not useEffect pause hook).
  useEffect(() => {
    return () => {
      amyVoiceController.pause();
    };
  }, []);

  const handlePlayPause = useCallback(() => {
    audioManager.unlockFromUserGesture();
    if (step >= lastIndex) {
      completedRef.current = false;
      setStep(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [step, lastIndex]);

  const handleReplay = useCallback(() => {
    audioManager.unlockFromUserGesture();
    pause();
    completedRef.current = false;
    setThinkingMode(false);
    setStep(0);
    setPlaying(true);
  }, [pause]);

  const handleThinkingReplay = useCallback(() => {
    audioManager.unlockFromUserGesture();
    const line = snapshots[0]?.thinkingNarration?.trim();
    if (line) primeStaticAudioInUserGesture(line, "default");
    pause();
    usedThinkingRef.current = true;
    completedRef.current = false;
    onSignal?.({ type: "thinking_replay" });
    setThinkingMode(true);
    setStep(0);
    setPlaying(true);
  }, [pause, onSignal, snapshots]);

  const handleStep = useCallback(
    (index: number) => {
      setPlaying(false);
      pause();
      setStep(Math.max(0, Math.min(index, lastIndex)));
    },
    [lastIndex, pause],
  );

  const handleToggleVoice = useCallback(() => {
    audioManager.unlockFromUserGesture();
    const line = (thinkingMode ? snapshot?.thinkingNarration : snapshot?.narration)?.trim();
    if (line) primeStaticAudioInUserGesture(line, "default");
    setVoiceEnabled((v) => {
      if (v) pause();
      return !v;
    });
  }, [pause, snapshot, thinkingMode]);

  // ── Layout partitioning ─────────────────────────────────────────────────────
  const byContainer = useMemo(() => groupObjects(snapshot.objects), [snapshot.objects]);
  const sceneSize = snapshot.objects.length;
  const containers = snapshot.containers;
  const baskets = containers.filter((c) => c.role === "basket");
  const rows = containers.filter((c) => c.role === "row");
  const pileAndFree = containers.filter((c) => c.role === "pile" || c.role === "free");
  const flowContainers = containers.filter(
    (c) =>
      c.role === "addend" || c.role === "result" || c.role === "free" || c.role === "pile",
  );
  const celebrating = snapshot.celebrate;

  const renderContainer = (c: SceneContainer, dense?: boolean) => (
    <GroupContainer
      key={c.id}
      container={c}
      objects={byContainer.get(c.id) ?? []}
      sceneSize={sceneSize}
      reduced={reduced}
      dense={dense}
      celebrating={celebrating}
    />
  );

  let stage: React.ReactNode;
  if (baskets.length > 0) {
    stage = (
      <div className="flex flex-col items-center gap-3">
        {pileAndFree.map((c) => renderContainer(c))}
        <DistributionContainer
          baskets={baskets}
          objectsByContainer={byContainer}
          sceneSize={sceneSize}
          reduced={reduced}
          celebrating={celebrating}
        />
      </div>
    );
  } else if (rows.length > 0) {
    stage = <div className="flex flex-col items-center gap-2">{rows.map((c) => renderContainer(c, true))}</div>;
  } else {
    const addends = flowContainers.filter((c) => c.role === "addend");
    const hasResult = flowContainers.some((c) => c.role === "result");
    stage = (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {flowContainers.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3">
            {i > 0 && !hasResult && addends.length > 1 && (
              <span className="text-2xl font-black text-white/35">+</span>
            )}
            {renderContainer(c)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-3 py-4"
      style={{
        background: budget.enableGradients
          ? "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))"
          : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <style>{MATH_ANIM_KEYFRAMES}</style>

      {/* Running total */}
      <div className="flex min-h-[58px] items-center justify-center">
        <CountingAnimator
          value={snapshot.total}
          color={accent}
          reduced={reduced}
          emphasize={snapshot.celebrate}
        />
      </div>

      {/* Stage */}
      <LayoutGroup>
        <motion.div layout className="flex min-h-[120px] items-center justify-center py-2">
          {stage}
        </motion.div>
      </LayoutGroup>

      {/* Thinking insight (Phase 1 / 6) */}
      <InsightLayer
        insightLine={meta?.insightLine}
        emphasisNote={snapshot.emphasisNote}
        relation={snapshot.emphasisRelation}
        thinking={thinkingMode}
        reduced={reduced}
      />

      {/* Symbolic bridge — concrete → abstract (Phase 2) */}
      {showEquation && (
        <EquationMorph
          parts={snapshot.equationParts}
          equation={snapshot.equation}
          color={accent}
          reduced={reduced}
        />
      )}

      <div className="mt-2">
        <StepNarrator
          caption={snapshot.caption}
          step={step}
          totalSteps={snapshots.length}
          playing={playing}
          finished={finished}
          reduced={reduced}
          accentColor={accent}
          voiceEnabled={voiceEnabled}
          voiceBusy={voiceEnabled && (speaking || loading)}
          onPlayPause={handlePlayPause}
          onReplay={handleReplay}
          onStep={handleStep}
          onToggleVoice={handleToggleVoice}
          onThinkingReplay={handleThinkingReplay}
          thinkingActive={thinkingMode}
          labels={{
            play: t("components.math_animation.play", "Play"),
            pause: t("components.math_animation.pause", "Pause"),
            replay: t("components.math_animation.replay", "Replay"),
            voiceOn: t("components.math_animation.voice_on", "Amy on"),
            voiceOff: t("components.math_animation.voice_off", "Amy off"),
            thinking: t("components.math_animation.show_thinking", "Show the thinking"),
          }}
        />
      </div>

      {/* Emotional reinforcement — celebrate thinking quality (Phase 3) */}
      <AnimatePresence>
        {snapshot.celebrate && meta?.praise && (
          <motion.div
            key="praise"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.95 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="mt-2 flex items-center justify-center"
          >
            <span
              className="rounded-full px-4 py-1.5 text-sm font-black"
              style={{
                color: "hsl(var(--brand-green-400))",
                background: "hsl(var(--brand-green-400) / 0.14)",
                border: "1px solid hsl(var(--brand-green-400) / 0.4)",
              }}
            >
              ✨ {meta.praise}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <CelebrationLayer
        active={snapshot.celebrate}
        particles={budget.particles}
        reduced={reduced}
        color={accent}
      />
    </div>
  );
}
