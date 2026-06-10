import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SubtractionPayload } from "@workspace/math-playground";
import { audioManager } from "@/lib/audio-manager";
import { EquationMorph } from "@/components/math-animation/EquationMorph";
import { useReducedMotion } from "@/lib/reduced-motion";
import { AmyCompanionBar } from "../shell/AmyCompanionBar";
import { ConfettiCelebration } from "../effects/ConfettiCelebration";
import { PlaygroundObject } from "../shared/PlaygroundObject";
import type { usePlaygroundAmy } from "../hooks/usePlaygroundAmy";

interface SubtractionGardenProps {
  payload: SubtractionPayload;
  amy: ReturnType<typeof usePlaygroundAmy>;
  accentColor: string;
  onComplete: (hintsUsed: number) => void;
}

export function SubtractionGarden({
  payload,
  amy,
  accentColor,
  onComplete,
}: SubtractionGardenProps) {
  const reduced = useReducedMotion();
  const remaining = payload.minuend - payload.subtrahend;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showEquation, setShowEquation] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [hintsUsed] = useState(0);

  const flowers = useMemo(
    () =>
      Array.from({ length: payload.minuend }, (_, i) => ({
        id: `f-${i}`,
        x: 8 + ((i * 17) % 84),
        y: 20 + ((i * 23) % 55),
      })),
    [payload.minuend],
  );

  const pickCount = picked.size;
  const done = pickCount === payload.subtrahend;

  useEffect(() => {
    amy.queueCue("amy_subtraction_intro", { pick: payload.subtrahend, total: payload.minuend });
  }, [payload.subtrahend, payload.minuend]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePick = useCallback(
    (id: string) => {
      if (picked.has(id) || done) return;
      audioManager.unlockFromUserGesture();
      setPicked((prev) => new Set([...prev, id]));
    },
    [picked, done],
  );

  useEffect(() => {
    if (!done) return;
    setShowEquation(true);
    setCelebrate(true);
    amy.queueCue("amy_great_job");
    const t = setTimeout(() => onComplete(hintsUsed), 2200);
    return () => clearTimeout(t);
  }, [done, hintsUsed, onComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <AmyCompanionBar
        messageKey={done ? "amy_great_job" : "amy_subtraction_intro"}
        messageVars={{ pick: payload.subtrahend, total: payload.minuend }}
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        speaking={amy.speaking}
      />

      <div
        className="relative rounded-2xl overflow-hidden mb-2"
        style={{
          minHeight: 200,
          background: "linear-gradient(180deg, rgba(236,72,153,0.15) 0%, rgba(34,139,34,0.12) 100%)",
          border: "1px solid rgba(236,72,153,0.3)",
        }}
      >
        <ConfettiCelebration active={celebrate} color={accentColor} />
        <div
          className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-black"
          style={{ background: "rgba(0,0,0,0.35)", color: accentColor }}
        >
          🌸 {payload.minuend - pickCount}
        </div>

        <AnimatePresence>
          {flowers.map((f) =>
            picked.has(f.id) ? null : (
              <motion.div
                key={f.id}
                className="absolute"
                style={{ left: `${f.x}%`, top: `${f.y}%`, transform: "translate(-50%, -50%)" }}
                exit={{ opacity: 0, y: -40, scale: 0.5, transition: { duration: 0.4 } }}
              >
                <PlaygroundObject
                  kind={payload.objectKind}
                  interactive
                  onTap={() => handlePick(f.id)}
                />
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showEquation && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-2"
          >
            <EquationMorph
              equation={`${payload.minuend} − ${payload.subtrahend} = ${remaining}`}
              color={accentColor}
              reduced={reduced}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
