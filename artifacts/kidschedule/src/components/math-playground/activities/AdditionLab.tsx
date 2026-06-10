import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AdditionPayload } from "@workspace/math-playground";
import { audioManager } from "@/lib/audio-manager";
import { EquationMorph } from "@/components/math-animation/EquationMorph";
import { useReducedMotion } from "@/lib/reduced-motion";
import { AmyCompanionBar } from "../shell/AmyCompanionBar";
import { ConfettiCelebration } from "../effects/ConfettiCelebration";
import { PlaygroundObject } from "../shared/PlaygroundObject";
import type { usePlaygroundAmy } from "../hooks/usePlaygroundAmy";

interface AdditionLabProps {
  payload: AdditionPayload;
  amy: ReturnType<typeof usePlaygroundAmy>;
  accentColor: string;
  onComplete: (hintsUsed: number) => void;
}

export function AdditionLab({ payload, amy, accentColor, onComplete }: AdditionLabProps) {
  const reduced = useReducedMotion();
  const total = payload.augend + payload.addend;
  const [inBasket, setInBasket] = useState(0);
  const [showEquation, setShowEquation] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const done = inBasket === total;

  const leftObjects = useMemo(
    () => Array.from({ length: payload.augend }, (_, i) => `l-${i}`),
    [payload.augend],
  );
  const rightObjects = useMemo(
    () => Array.from({ length: payload.addend }, (_, i) => `r-${i}`),
    [payload.addend],
  );
  const [movedLeft, setMovedLeft] = useState<Set<string>>(new Set());
  const [movedRight, setMovedRight] = useState<Set<string>>(new Set());

  useEffect(() => {
    amy.queueCue("amy_addition_intro", { a: payload.augend, b: payload.addend });
  }, [payload.augend, payload.addend]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveToBasket = useCallback(
    (side: "left" | "right", id: string) => {
      if (done) return;
      audioManager.unlockFromUserGesture();
      if (side === "left" && !movedLeft.has(id)) {
        setMovedLeft((s) => new Set([...s, id]));
        setInBasket((n) => n + 1);
      }
      if (side === "right" && !movedRight.has(id)) {
        setMovedRight((s) => new Set([...s, id]));
        setInBasket((n) => n + 1);
      }
    },
    [done, movedLeft, movedRight],
  );

  useEffect(() => {
    if (!done) return;
    amy.queueCue("amy_count_together");
    setShowEquation(true);
    setCelebrate(true);
    const t = setTimeout(() => onComplete(hintsUsed), 2200);
    return () => clearTimeout(t);
  }, [done, hintsUsed, onComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <AmyCompanionBar
        messageKey={done ? "amy_great_job" : "amy_addition_intro"}
        messageVars={{ a: payload.augend, b: payload.addend }}
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        speaking={amy.speaking}
      />

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div
          className="rounded-xl p-2 min-h-[100px] flex flex-wrap gap-1 justify-center items-center content-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {leftObjects.map(
            (id) =>
              !movedLeft.has(id) && (
                <PlaygroundObject
                  key={id}
                  kind={payload.objectKind}
                  size={30}
                  interactive
                  onTap={() => moveToBasket("left", id)}
                />
              ),
          )}
        </div>
        <div className="flex items-center justify-center text-2xl font-black text-white/30">+</div>
        <div
          className="rounded-xl p-2 min-h-[100px] flex flex-wrap gap-1 justify-center items-center content-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {rightObjects.map(
            (id) =>
              !movedRight.has(id) && (
                <PlaygroundObject
                  key={id}
                  kind={payload.objectKind}
                  size={30}
                  interactive
                  onTap={() => moveToBasket("right", id)}
                />
              ),
          )}
        </div>
      </div>

      <motion.button
        type="button"
        onClick={() => {
          /* basket drop zone — objects tap into basket */
        }}
        className="relative w-full rounded-2xl py-4 mb-2 flex flex-wrap gap-1 justify-center items-center min-h-[80px]"
        style={{
          background: "linear-gradient(180deg, rgba(245,158,11,0.2), rgba(0,0,0,0.25))",
          border: `2px dashed ${accentColor}66`,
        }}
        animate={inBasket > 0 ? { scale: [1, 1.02, 1] } : undefined}
      >
        <ConfettiCelebration active={celebrate} color={accentColor} />
        <span className="absolute top-2 left-3 text-[10px] font-bold text-white/40">🧺 Basket</span>
        {Array.from({ length: inBasket }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 16 }}
          >
            <PlaygroundObject kind={payload.objectKind} size={28} />
          </motion.span>
        ))}
      </motion.button>

      <AnimatePresence>
        {showEquation && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-2"
          >
            <EquationMorph
              equation={`${payload.augend} + ${payload.addend} = ${total}`}
              color={accentColor}
              reduced={reduced}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!done && inBasket === 0 && (
        <button
          type="button"
          onClick={() => {
            setHintsUsed((h) => h + 1);
            amy.queueCue("amy_tap_to_basket");
          }}
          className="w-full py-2 text-xs font-bold text-white/50"
        >
          💡 Hint
        </button>
      )}
    </div>
  );
}
