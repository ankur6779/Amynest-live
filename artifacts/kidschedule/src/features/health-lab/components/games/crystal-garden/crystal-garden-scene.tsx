import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GardenStage } from "./crystal-garden-constants";

const SPROUT_POSITIONS = [
  { left: "12%", bottom: "18%" },
  { left: "32%", bottom: "12%" },
  { left: "58%", bottom: "16%" },
  { left: "78%", bottom: "20%" },
];

const FLOWER_POSITIONS = [
  { left: "8%", bottom: "28%", emoji: "🌸" },
  { left: "22%", bottom: "35%", emoji: "💎" },
  { left: "40%", bottom: "30%", emoji: "🌺" },
  { left: "55%", bottom: "38%", emoji: "🌸" },
  { left: "70%", bottom: "32%", emoji: "💎" },
  { left: "85%", bottom: "28%", emoji: "🌷" },
  { left: "30%", bottom: "22%", emoji: "🌸" },
  { left: "48%", bottom: "24%", emoji: "💎" },
  { left: "62%", bottom: "26%", emoji: "🌺" },
  { left: "18%", bottom: "42%", emoji: "🌷" },
];

const DANCE_NOTES = ["🎵", "🎶", "🎼", "✨", "💫"];

export const CrystalGardenScene = memo(function CrystalGardenScene({
  stage,
  phase,
  reduced,
  blooming,
}: {
  stage: GardenStage;
  phase: string;
  reduced: boolean;
  blooming?: boolean;
}) {
  const dancing = phase === "dance";

  return (
    <div className="relative h-56 w-full max-w-md sm:h-60">
      {!reduced && (
        <>
          <div className="health-lab-aurora pointer-events-none absolute -inset-x-6 -top-8 h-40 opacity-70" aria-hidden />
          {dancing && (
            <motion.div
              className="pointer-events-none absolute -inset-x-4 -top-4 h-44 rounded-[2rem] bg-gradient-to-r from-pink-500/20 via-violet-500/25 to-cyan-400/20 blur-xl"
              animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.05, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              aria-hidden
            />
          )}
        </>
      )}

      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-[1.75rem] border-2",
          dancing
            ? "border-pink-300/35 bg-gradient-to-b from-emerald-800/55 via-teal-900/45 to-violet-950/50 shadow-[0_0_40px_-8px_rgba(236,72,153,0.45)]"
            : "border-white/15 bg-gradient-to-b from-emerald-950/50 via-teal-950/35 to-indigo-950/40",
          "backdrop-blur-md",
          blooming && !reduced && "health-lab-island-rise",
          dancing && !reduced && "health-lab-dance-floor",
        )}
      >
        {dancing && !reduced && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-pink-500/15 via-violet-500/10 to-transparent"
            aria-hidden
          />
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-emerald-800/50 to-transparent" aria-hidden />

        {dancing && !reduced && (
          <div className="pointer-events-none absolute inset-x-4 bottom-3 flex justify-between opacity-60" aria-hidden>
            {["🟣", "🔵", "🟢", "🟡", "🩷", "🟣"].map((dot, i) => (
              <motion.span
                key={`disco-${i}`}
                className="text-[10px]"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
              >
                {dot}
              </motion.span>
            ))}
          </div>
        )}

        {SPROUT_POSITIONS.slice(0, stage.sprouts).map((p, i) => (
          <motion.span
            key={`sprout-${i}`}
            className="absolute text-xl sm:text-2xl"
            style={{ left: p.left, bottom: p.bottom }}
            animate={
              dancing && !reduced
                ? { y: [0, -10, 0, -6, 0], scale: [1, 1.15, 1, 1.1, 1], rotate: [-4, 4, -2, 2, 0] }
                : { scale: [1, 1.04, 1] }
            }
            transition={{ duration: dancing ? 0.55 : 2.5, repeat: Infinity, delay: i * 0.1 }}
            aria-hidden
          >
            {i < stage.flowers ? "💎" : "🌱"}
          </motion.span>
        ))}

        {FLOWER_POSITIONS.slice(0, stage.flowers).map((f, i) => (
          <motion.span
            key={`flower-${i}`}
            className="absolute text-base sm:text-xl"
            style={{ left: f.left, bottom: f.bottom }}
            animate={
              blooming && !reduced
                ? { scale: [0, 1.4, 1], opacity: [0, 1, 1] }
                : dancing && !reduced
                  ? { y: [0, -8, 0], rotate: [-8, 8, -4, 4, 0], scale: [1, 1.12, 1] }
                  : { scale: [1, 1.06, 1] }
            }
            transition={{ duration: blooming ? 0.7 : dancing ? 0.65 : 2, repeat: blooming ? 0 : Infinity, delay: i * 0.07 }}
            aria-hidden
          >
            {f.emoji}
          </motion.span>
        ))}

        {!reduced &&
          stage.butterflies > 0 &&
          [...Array(stage.butterflies)].map((_, i) => (
            <motion.span
              key={`bf-${i}`}
              className="absolute text-lg"
              style={{ left: `${15 + i * 14}%`, bottom: `${45 + (i % 3) * 8}%` }}
              animate={
                dancing
                  ? { x: [0, 20, -14, 0], y: [0, -18, -6, 0], rotate: [0, 12, -8, 0] }
                  : { x: [0, 14, -10, 0], y: [0, -12, 0] }
              }
              transition={{ duration: dancing ? 1.2 : 3 + i * 0.3, repeat: Infinity, delay: i * 0.25 }}
              aria-hidden
            >
              🦋
            </motion.span>
          ))}

        {stage.animals.map((animal, i) => (
          <motion.span
            key={`animal-${animal}`}
            className="absolute text-2xl"
            style={{ left: `${20 + i * 22}%`, bottom: `${38 + (i % 2) * 10}%` }}
            animate={
              !reduced
                ? dancing
                  ? { y: [0, -10, 0], rotate: [-6, 6, 0], scale: [1, 1.12, 1] }
                  : { y: [0, -5, 0], scale: [1, 1.05, 1] }
                : {}
            }
            transition={{ duration: dancing ? 0.7 : 2.2 + i * 0.2, repeat: Infinity, delay: i * 0.2 }}
            aria-hidden
          >
            {animal}
          </motion.span>
        ))}

        {stage.tree && (
          <motion.div
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-center"
            animate={!reduced ? (dancing ? { scale: [1, 1.08, 1], y: [0, -6, 0] } : { scale: [1, 1.04, 1], y: [0, -3, 0] }) : {}}
            transition={{ duration: dancing ? 0.6 : 3, repeat: Infinity }}
          >
            <span className="text-4xl sm:text-5xl drop-shadow-lg" aria-hidden>
              🌳
            </span>
            <div className="mx-auto mt-1 h-8 w-8 rounded-full bg-cyan-300/50 blur-md" aria-hidden />
          </motion.div>
        )}

        {stage.dragon && !reduced && (
          <motion.span
            className="absolute right-[8%] top-[12%] text-2xl"
            animate={dancing ? { y: [0, -12, 0], x: [0, 10, 0], rotate: [0, 8, -8, 0] } : { y: [0, -8, 0], x: [0, 6, 0] }}
            transition={{ duration: dancing ? 0.8 : 2.5, repeat: Infinity }}
            aria-hidden
          >
            🐉
          </motion.span>
        )}

        {dancing && !reduced && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.span
                key={`dust-${i}`}
                className="absolute text-sm text-amber-200/90"
                style={{ left: `${5 + i * 12}%`, bottom: `${18 + (i % 4) * 12}%` }}
                animate={{ y: [0, -28, 0], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                aria-hidden
              >
                ✨
              </motion.span>
            ))}
            {DANCE_NOTES.map((note, i) => (
              <motion.span
                key={`note-${note}-${i}`}
                className="absolute text-base text-pink-200/90"
                style={{ left: `${18 + i * 16}%`, top: `${8 + (i % 2) * 12}%` }}
                animate={{ y: [0, -16, 0], opacity: [0.4, 1, 0.4], rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                aria-hidden
              >
                {note}
              </motion.span>
            ))}
          </>
        )}
      </div>
    </div>
  );
});
