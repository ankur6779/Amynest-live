import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PatternPayload } from "@workspace/math-playground";
import { audioManager } from "@/lib/audio-manager";
import { useReducedMotion } from "@/lib/reduced-motion";
import { PlaygroundAmyShell } from "../shell/PlaygroundAmyShell";
import { ConfettiCelebration } from "../effects/ConfettiCelebration";
import { isMpAmyAvatarEnabled } from "../lib/feature-flags";
import type { ActivitySharedProps } from "./activity-shared-props";

interface NumberPatternsProps extends ActivitySharedProps {
  payload: PatternPayload;
}

export function NumberPatterns({
  payload,
  amy,
  accentColor,
  onComplete,
  engagement,
}: NumberPatternsProps) {
  const reduced = useReducedMotion();
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [filled, setFilled] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const done = filled === payload.correctChoice;

  useEffect(() => {
    amy.queueCue("amy_pattern_intro");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlotTap = useCallback(() => {
    if (filled !== null || selectedChoice === null) return;
    audioManager.unlockFromUserGesture();
    engagement?.recordInteraction();
    if (selectedChoice === payload.correctChoice) {
      setFilled(selectedChoice);
      setCelebrate(true);
      amy.queueCue("amy_great_job");
      window.setTimeout(() => onComplete(hintsUsed), 1800);
    } else {
      setWrong(true);
      engagement?.recordFailure();
      setHintsUsed((h) => h + 1);
      if (!isMpAmyAvatarEnabled()) {
        amy.queueCue("amy_try_together");
      }
      window.setTimeout(() => setWrong(false), 500);
      setSelectedChoice(null);
    }
  }, [filled, selectedChoice, payload.correctChoice, hintsUsed, onComplete, amy, engagement]);

  return (
    <div>
      <PlaygroundAmyShell
        messageKey={done ? "amy_great_job" : "amy_pattern_intro"}
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        speaking={amy.speaking}
        engagement={engagement}
        accentColor={accentColor}
      />

      <div
        className="relative rounded-2xl p-4 mb-3"
        style={{
          background: "linear-gradient(145deg, rgba(139,92,246,0.15), rgba(0,0,0,0.25))",
          border: "1px solid rgba(139,92,246,0.35)",
        }}
      >
        <ConfettiCelebration active={celebrate} color={accentColor} />
        <p className="text-[10px] font-bold text-white/40 text-center mb-3">
          {payload.stepLabel} each step
        </p>
        <div className="flex justify-center gap-2 items-center">
          {payload.sequence.map((val, i) => (
            <PatternCard
              key={i}
              value={val === null ? filled : val}
              blank={val === null}
              wrong={wrong && val === null}
              onTap={val === null ? handleSlotTap : undefined}
              accentColor={accentColor}
              reduced={reduced}
            />
          ))}
        </div>
      </div>

      {!done && (
        <div className="flex justify-center gap-2">
          {payload.choices.map((choice) => (
            <motion.button
              key={choice}
              type="button"
              onClick={() => {
                audioManager.unlockFromUserGesture();
                setSelectedChoice(choice);
              }}
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-xl font-black text-lg"
              style={{
                background:
                  selectedChoice === choice
                    ? `${accentColor}44`
                    : "rgba(255,255,255,0.08)",
                border: `2px solid ${selectedChoice === choice ? accentColor : "rgba(255,255,255,0.12)"}`,
                color: "white",
              }}
            >
              {choice}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function PatternCard({
  value,
  blank,
  wrong,
  onTap,
  accentColor,
  reduced,
}: {
  value: number | null;
  blank: boolean;
  wrong: boolean;
  onTap?: () => void;
  accentColor: string;
  reduced: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onTap}
      disabled={!blank || value !== null}
      animate={
        wrong
          ? { x: [-3, 3, -3, 3, 0] }
          : value !== null && blank
            ? { rotateY: reduced ? 0 : [0, 180, 360] }
            : {}
      }
      className="w-12 h-14 rounded-xl font-black text-base flex items-center justify-center"
      style={{
        background: blank
          ? value !== null
            ? `${accentColor}33`
            : "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.12)",
        border: `2px ${blank ? "dashed" : "solid"} ${blank ? accentColor : "rgba(255,255,255,0.2)"}`,
        color: "white",
      }}
    >
      {value ?? "?"}
    </motion.button>
  );
}
