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
    <div className="relative h-52 w-full max-w-md sm:h-56">
      {!reduced && (
        <div className="health-lab-aurora pointer-events-none absolute -inset-x-6 -top-8 h-36 opacity-50" aria-hidden />
      )}

      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-[1.75rem] border border-white/15",
          "bg-gradient-to-b from-emerald-950/50 via-teal-950/35 to-indigo-950/40 backdrop-blur-md",
          blooming && !reduced && "health-lab-island-rise",
        )}
      >
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-emerald-900/40 to-transparent" aria-hidden />

        {SPROUT_POSITIONS.slice(0, stage.sprouts).map((p, i) => (
          <motion.span
            key={`sprout-${i}`}
            className="absolute text-lg"
            style={{ left: p.left, bottom: p.bottom }}
            animate={
              dancing && !reduced
                ? { y: [0, -3, 0], scale: [1, 1.06, 1] }
                : { scale: [1, 1.03, 1] }
            }
            transition={{ duration: dancing ? 0.8 : 2.5, repeat: Infinity, delay: i * 0.12 }}
            aria-hidden
          >
            {i < stage.flowers ? "💎" : "🌱"}
          </motion.span>
        ))}

        {FLOWER_POSITIONS.slice(0, stage.flowers).map((f, i) => (
          <motion.span
            key={`flower-${i}`}
            className="absolute text-base sm:text-lg"
            style={{ left: f.left, bottom: f.bottom }}
            animate={
              blooming && !reduced
                ? { scale: [0, 1.3, 1], opacity: [0, 1, 1] }
                : dancing && !reduced
                  ? { y: [0, -4, 0], rotate: [-3, 3, 0] }
                  : { scale: [1, 1.05, 1] }
            }
            transition={{ duration: blooming ? 0.7 : 2, repeat: blooming ? 0 : Infinity, delay: i * 0.08 }}
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
              className="absolute text-base"
              style={{ left: `${15 + i * 14}%`, bottom: `${45 + (i % 3) * 8}%` }}
              animate={{ x: [0, 14, -10, 0], y: [0, -12, 0] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
              aria-hidden
            >
              🦋
            </motion.span>
          ))}

        {stage.animals.map((animal, i) => (
          <motion.span
            key={`animal-${animal}`}
            className="absolute text-xl"
            style={{ left: `${20 + i * 22}%`, bottom: `${38 + (i % 2) * 10}%` }}
            animate={!reduced ? { y: [0, -5, 0], scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2.2 + i * 0.2, repeat: Infinity, delay: i * 0.3 }}
            aria-hidden
          >
            {animal}
          </motion.span>
        ))}

        {stage.tree && (
          <motion.div
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-center"
            animate={!reduced ? { scale: [1, 1.04, 1], y: [0, -3, 0] } : {}}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-4xl sm:text-5xl drop-shadow-lg" aria-hidden>
              🌳
            </span>
            <div className="mx-auto mt-1 h-8 w-8 rounded-full bg-cyan-300/40 blur-md" aria-hidden />
          </motion.div>
        )}

        {stage.dragon && !reduced && (
          <motion.span
            className="absolute right-[8%] top-[12%] text-2xl"
            animate={{ y: [0, -8, 0], x: [0, 6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            aria-hidden
          >
            🐉
          </motion.span>
        )}

        {dancing && !reduced && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.span
                key={`dust-${i}`}
                className="absolute text-xs text-cyan-200/70"
                style={{ left: `${10 + i * 18}%`, bottom: `${20 + (i % 3) * 15}%` }}
                animate={{ y: [0, -20, 0], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
                aria-hidden
              >
                ✨
              </motion.span>
            ))}
          </>
        )}
      </div>
    </div>
  );
});
