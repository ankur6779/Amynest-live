import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio-manager";
import type { MiniGameProps } from "./mini-game-shared";

export function RocketCounting({
  payload,
  accentColor,
  onCorrect,
  onWrong,
  engagement,
  locked,
}: MiniGameProps) {
  const target = payload.fuelTarget ?? 0;
  const choices = payload.choices ?? [];

  return (
    <div className="text-center">
      <motion.div
        className="text-5xl mb-2"
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        🚀
      </motion.div>
      <p className="text-sm font-bold text-white/80 mb-4">
        Pick fuel level <span style={{ color: accentColor }}>{target}</span>
      </p>
      <div className="flex justify-center gap-2 flex-wrap">
        {choices.map((val) => (
          <motion.button
            key={val}
            type="button"
            data-testid={`mp-mini-choice-${val}`}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (locked) return;
              audioManager.unlockFromUserGesture();
              engagement?.recordInteraction();
              if (val === target) onCorrect();
              else onWrong();
            }}
            disabled={locked}
            className="w-14 h-14 rounded-xl font-black text-xl text-white disabled:opacity-40"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: `2px solid ${accentColor}55`,
            }}
          >
            {val}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
