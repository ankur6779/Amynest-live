import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio-manager";
import type { MiniGameProps } from "./mini-game-shared";

const BALLOON_COLORS = ["#f472b6", "#60a5fa", "#fbbf24", "#a78bfa", "#34d399"];

export function PopCorrectAnswer({
  payload,
  accentColor,
  onCorrect,
  onWrong,
  engagement,
}: MiniGameProps) {
  const choices = payload.choices ?? [];
  const correct = payload.correctAnswer ?? choices[payload.correctIndex ?? 0];

  return (
    <div className="text-center">
      <p className="text-lg font-black text-white mb-4">{payload.question}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {choices.map((val, i) => (
          <motion.button
            key={`${val}-${i}`}
            type="button"
            whileTap={{ scale: 0.88 }}
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2 + i * 0.2, ease: "easeInOut" }}
            onClick={() => {
              audioManager.unlockFromUserGesture();
              engagement?.recordInteraction();
              if (val === correct) onCorrect();
              else onWrong();
            }}
            className="relative w-20 h-24 rounded-full font-black text-2xl text-white shadow-lg"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${BALLOON_COLORS[i % BALLOON_COLORS.length]}, ${accentColor})`,
              border: `2px solid ${accentColor}88`,
            }}
          >
            {val}
            <span
              className="absolute bottom-0 left-1/2 w-0.5 h-6 -translate-x-1/2 translate-y-full bg-white/30"
              aria-hidden
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
