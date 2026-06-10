import { useState } from "react";
import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio-manager";
import type { MiniGameProps } from "./mini-game-shared";

export function CastleBuilder({
  payload,
  accentColor,
  onCorrect,
  onWrong,
  engagement,
}: MiniGameProps) {
  const rounds = payload.castleRounds ?? [];
  const total = payload.castlePiecesTotal ?? rounds.length;
  const [piece, setPiece] = useState(0);
  const current = rounds[piece];

  const answer = (val: number) => {
    if (!current) return;
    audioManager.unlockFromUserGesture();
    engagement?.recordInteraction();
    if (val === current.answer) {
      const next = piece + 1;
      if (next >= total) onCorrect();
      else setPiece(next);
    } else {
      onWrong();
    }
  };

  return (
    <div>
      <div className="flex justify-center gap-1 mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: i < piece ? 1 : i === piece ? 1.05 : 0.7, y: 0 }}
            className="text-2xl"
            style={{ opacity: i <= piece ? 1 : 0.35 }}
          >
            {i === 0 ? "🏰" : i === total - 1 ? "🚩" : "🧱"}
          </motion.div>
        ))}
      </div>
      {current && (
        <>
          <p className="text-center text-lg font-black text-white mb-3">{current.question}</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {current.choices.map((val) => (
              <motion.button
                key={val}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => answer(val)}
                className="w-14 h-14 rounded-xl font-black text-xl text-white"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: `2px solid ${accentColor}44`,
                }}
              >
                {val}
              </motion.button>
            ))}
          </div>
        </>
      )}
      <p className="text-center text-xs text-white/40 mt-3">
        Piece {Math.min(piece + 1, total)} / {total}
      </p>
    </div>
  );
}
