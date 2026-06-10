import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MultiplicationPayload } from "@workspace/math-playground";
import { audioManager } from "@/lib/audio-manager";
import { EquationMorph } from "@/components/math-animation/EquationMorph";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import { AmyCompanionBar } from "../shell/AmyCompanionBar";
import { ConfettiCelebration } from "../effects/ConfettiCelebration";
import { PlaygroundObject } from "../shared/PlaygroundObject";
import type { usePlaygroundAmy } from "../hooks/usePlaygroundAmy";

interface MultiplicationFactoryProps {
  payload: MultiplicationPayload;
  amy: ReturnType<typeof usePlaygroundAmy>;
  accentColor: string;
  onComplete: (hintsUsed: number) => void;
}

export function MultiplicationFactory({
  payload,
  amy,
  accentColor,
  onComplete,
}: MultiplicationFactoryProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const total = payload.groups * payload.perGroup;
  const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
  const [showEquation, setShowEquation] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [hintsUsed] = useState(0);
  const allOpen = openedBoxes.size === payload.groups;

  useEffect(() => {
    amy.queueCue("amy_multiply_intro", { groups: payload.groups, each: payload.perGroup });
  }, [payload.groups, payload.perGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBox = useCallback(
    (idx: number) => {
      if (openedBoxes.has(idx)) return;
      audioManager.unlockFromUserGesture();
      setOpenedBoxes((prev) => new Set([...prev, idx]));
    },
    [openedBoxes],
  );

  useEffect(() => {
    if (!allOpen) return;
    amy.queueCue("amy_groups_of", { groups: payload.groups, each: payload.perGroup });
    setShowEquation(true);
    setCelebrate(true);
    const t = window.setTimeout(() => onComplete(hintsUsed), 2400);
    return () => window.clearTimeout(t);
  }, [allOpen, hintsUsed, onComplete, payload.groups, payload.perGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <AmyCompanionBar
        messageKey={allOpen ? "amy_great_job" : "amy_multiply_intro"}
        messageVars={{ groups: payload.groups, each: payload.perGroup }}
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        speaking={amy.speaking}
      />

      <div
        className="relative rounded-2xl overflow-hidden mb-2"
        style={{
          minHeight: 200,
          background: "linear-gradient(180deg, rgba(99,102,241,0.2) 0%, rgba(30,27,75,0.5) 100%)",
          border: "1px solid rgba(99,102,241,0.35)",
        }}
      >
        <ConfettiCelebration active={celebrate} color={accentColor} />

        {/* Conveyor belt */}
        {budget.tier !== "low" && !reduced && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-3 opacity-40"
            style={{ background: "repeating-linear-gradient(90deg, #444 0 12px, #666 12px 24px)" }}
            animate={{ backgroundPositionX: ["0px", "24px"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          />
        )}

        <div className="flex justify-center gap-3 pt-6 pb-8 px-2 flex-wrap">
          {Array.from({ length: payload.groups }).map((_, idx) => (
            <motion.button
              key={idx}
              type="button"
              onClick={() => openBox(idx)}
              disabled={openedBoxes.has(idx)}
              whileTap={{ scale: 0.92 }}
              className="relative rounded-xl p-3 min-w-[72px] min-h-[88px] flex flex-col items-center"
              style={{
                background: openedBoxes.has(idx)
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(145deg, rgba(99,102,241,0.4), rgba(49,46,129,0.6))",
                border: `2px solid ${openedBoxes.has(idx) ? "rgba(255,255,255,0.15)" : accentColor}`,
              }}
            >
              <span className="text-lg mb-1">{openedBoxes.has(idx) ? "📦" : "📫"}</span>
              <AnimatePresence>
                {openedBoxes.has(idx) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-0.5 justify-center max-w-[64px]"
                  >
                    {Array.from({ length: payload.perGroup }).map((__, ti) => (
                      <PlaygroundObject key={ti} kind={payload.objectKind} size={18} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {allOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-1 justify-center pb-4 px-2"
          >
            {Array.from({ length: total }).map((_, i) => (
              <PlaygroundObject key={i} kind={payload.objectKind} size={22} />
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showEquation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <EquationMorph
              equation={`${payload.groups} × ${payload.perGroup} = ${total}`}
              color={accentColor}
              reduced={reduced}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
