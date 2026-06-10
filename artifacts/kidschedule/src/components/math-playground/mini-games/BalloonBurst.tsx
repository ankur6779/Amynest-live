import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { audioManager } from "@/lib/audio-manager";
import type { MiniGameProps } from "./mini-game-shared";

export function BalloonBurst({
  payload,
  accentColor,
  onCorrect,
  onWrong,
  engagement,
}: MiniGameProps) {
  const target = payload.targetQuantity ?? 0;
  const [popped, setPopped] = useState<Set<string>>(new Set());

  const handlePop = (id: string) => {
    if (popped.has(id)) return;
    audioManager.unlockFromUserGesture();
    engagement?.recordInteraction();
    const next = new Set([...popped, id]);
    setPopped(next);
    if (next.size === target) {
      onCorrect();
    } else if (next.size > target) {
      onWrong();
      setPopped(new Set());
    }
  };

  return (
    <div>
      <p className="text-center text-sm font-bold text-white/80 mb-3">
        Pop exactly <span style={{ color: accentColor }}>{target}</span> balloons 🎈
      </p>
      <div className="flex flex-wrap justify-center gap-2 min-h-[120px]">
        <AnimatePresence>
          {(payload.balloons ?? []).map((balloon, i) =>
            popped.has(balloon.id) ? null : (
              <motion.button
                key={balloon.id}
                type="button"
                initial={{ scale: 0 }}
                animate={{ scale: 1, y: [0, -4, 0] }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={{ y: { repeat: Infinity, duration: 1.8 + i * 0.1 } }}
                whileTap={{ scale: 0.85 }}
                onClick={() => handlePop(balloon.id)}
                className="w-14 h-16 rounded-full font-bold text-white text-sm"
                style={{
                  background: `linear-gradient(160deg, ${accentColor}, hsl(var(--brand-pink-400)))`,
                }}
              >
                🎈
              </motion.button>
            ),
          )}
        </AnimatePresence>
      </div>
      <p className="text-center text-xs text-white/40 mt-2">
        Popped: {popped.size} / {target}
      </p>
    </div>
  );
}
