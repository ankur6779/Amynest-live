import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio-manager";
import type { MiniGameProps } from "./mini-game-shared";

export function NumberTrain({
  payload,
  accentColor,
  onCorrect,
  onWrong,
  engagement,
  locked,
}: MiniGameProps) {
  const sequence = payload.trainSequence ?? [];
  const choices = payload.trainChoices ?? [];
  const correct = payload.correctAnswer ?? 0;

  return (
    <div>
      <p className="text-center text-sm font-bold text-white/70 mb-3">🚂 Complete the train!</p>
      <div className="flex justify-center gap-1.5 mb-4 flex-wrap">
        {sequence.map((val, i) => (
          <div
            key={i}
            className="min-w-[44px] h-12 rounded-lg flex items-center justify-center font-black text-lg text-white"
            style={{
              background: val === null ? `${accentColor}33` : "rgba(255,255,255,0.1)",
              border: `2px dashed ${val === null ? accentColor : "rgba(255,255,255,0.15)"}`,
            }}
          >
            {val === null ? "?" : val}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2">
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
              if (val === correct) onCorrect();
              else onWrong();
            }}
            disabled={locked}
            className="w-14 h-14 rounded-xl font-black text-xl text-white disabled:opacity-40"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: `2px solid ${accentColor}44`,
            }}
          >
            {val}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
