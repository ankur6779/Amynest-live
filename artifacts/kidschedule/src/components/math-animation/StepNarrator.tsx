import { AnimatePresence, motion } from "framer-motion";

interface StepNarratorProps {
  caption?: string;
  step: number;
  totalSteps: number;
  playing: boolean;
  finished: boolean;
  reduced: boolean;
  accentColor?: string;
  voiceEnabled: boolean;
  voiceBusy?: boolean;
  onPlayPause: () => void;
  onReplay: () => void;
  onStep: (index: number) => void;
  onToggleVoice: () => void;
  /** Replay-Thinking mode (Phase 6): slower, reasoning-focused walkthrough. */
  onThinkingReplay?: () => void;
  thinkingActive?: boolean;
  labels: {
    play: string;
    pause: string;
    replay: string;
    voiceOn: string;
    voiceOff: string;
    thinking: string;
  };
}

/**
 * Caption + transport controls beneath the scene. Shows the live caption,
 * a step-progress strip the child can scrub, play/pause/replay and an
 * Amy-voice toggle. Captions are announced via aria-live for accessibility.
 */
export function StepNarrator({
  caption,
  step,
  totalSteps,
  playing,
  finished,
  reduced,
  accentColor = "hsl(var(--brand-amber-400))",
  voiceEnabled,
  voiceBusy,
  onPlayPause,
  onReplay,
  onStep,
  onToggleVoice,
  onThinkingReplay,
  thinkingActive,
  labels,
}: StepNarratorProps) {
  return (
    <div className="space-y-2.5">
      {/* Caption */}
      <div className="flex min-h-[40px] items-center justify-center px-2 text-center">
        <AnimatePresence mode="wait">
          {caption ? (
            <motion.p
              key={caption}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduced ? 0.12 : 0.28 }}
              className="text-sm font-bold leading-snug text-white/90"
              aria-live="polite"
            >
              {caption}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Step progress strip */}
      <div className="flex items-center justify-center gap-1.5" role="group" aria-label="Steps">
        {Array.from({ length: totalSteps }, (_, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <button
              key={i}
              onClick={() => onStep(i)}
              aria-label={`Step ${i + 1}`}
              className="rounded-full transition-all active:scale-90"
              style={{
                width: active ? 22 : 9,
                height: 9,
                background: active || done ? accentColor : "rgba(255,255,255,0.18)",
                opacity: done && !active ? 0.55 : 1,
              }}
            />
          );
        })}
      </div>

      {/* Transport */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={finished ? onReplay : onPlayPause}
          className="flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-black text-white transition-all active:scale-95"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
        >
          {finished ? `↻ ${labels.replay}` : playing ? `⏸ ${labels.pause}` : `▶ ${labels.play}`}
        </button>
        <button
          onClick={onToggleVoice}
          aria-pressed={voiceEnabled}
          className="flex items-center gap-1 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all active:scale-95"
          style={{
            background: voiceEnabled ? `${accentColor}22` : "rgba(255,255,255,0.08)",
            border: `1.5px solid ${voiceEnabled ? accentColor : "rgba(255,255,255,0.14)"}`,
            color: voiceEnabled ? accentColor : "rgba(255,255,255,0.55)",
          }}
        >
          {voiceBusy ? "🔊" : voiceEnabled ? "🔈" : "🔇"}{" "}
          {voiceEnabled ? labels.voiceOn : labels.voiceOff}
        </button>
      </div>

      {/* Replay-Thinking (Phase 6) — re-teaches the reasoning, slower. */}
      {onThinkingReplay && (
        <div className="flex justify-center">
          <button
            onClick={onThinkingReplay}
            aria-pressed={thinkingActive}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition-all active:scale-95"
            style={{
              background: thinkingActive
                ? "hsl(var(--brand-violet-400) / 0.18)"
                : "rgba(255,255,255,0.06)",
              border: `1.5px solid ${thinkingActive ? "hsl(var(--brand-violet-400))" : "rgba(255,255,255,0.14)"}`,
              color: thinkingActive ? "hsl(var(--brand-violet-400))" : "rgba(255,255,255,0.7)",
            }}
          >
            🧠 {labels.thinking}
          </button>
        </div>
      )}
    </div>
  );
}
