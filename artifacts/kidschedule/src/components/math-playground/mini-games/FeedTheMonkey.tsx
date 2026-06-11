import { useState } from "react";
import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio-manager";
import type { MiniGameProps } from "./mini-game-shared";

export function FeedTheMonkey({
  payload,
  accentColor,
  onCorrect,
  engagement,
  locked,
}: MiniGameProps) {
  const target = payload.targetBananas ?? 0;
  const [fed, setFed] = useState(0);

  const feedBanana = () => {
    if (locked) return;
    audioManager.unlockFromUserGesture();
    engagement?.recordInteraction();

    setFed((prev) => {
      if (prev >= target) return prev;
      const next = prev + 1;
      if (next === target) onCorrect();
      return next;
    });
  };

  return (
    <div className="text-center">
      <motion.div
        className="text-5xl mb-2"
        animate={fed > 0 ? { rotate: [0, -8, 8, 0] } : undefined}
        transition={{ duration: 0.4 }}
      >
        🐵
      </motion.div>
      <p className="text-sm font-bold text-white/80 mb-3">
        Feed <span style={{ color: accentColor }}>{target}</span> bananas
      </p>
      <div className="flex justify-center gap-2 flex-wrap mb-3">
        {Array.from({ length: target + 2 }).map((_, i) => (
          <motion.button
            key={i}
            type="button"
            whileTap={{ scale: 0.85, y: -12 }}
            disabled={fed >= target || locked}
            onClick={feedBanana}
            className="text-3xl p-2 rounded-xl disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            🍌
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-white/40">Fed: {fed} / {target}</p>
    </div>
  );
}
