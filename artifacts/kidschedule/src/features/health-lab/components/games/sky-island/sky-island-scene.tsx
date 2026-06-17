import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { IslandEvolution, StabilityVisualTier } from "./sky-island-constants";

const FLOWER_POSITIONS = [
  { left: "8%", top: "18%", emoji: "🌸", size: "text-xl" },
  { left: "78%", top: "22%", emoji: "🌼", size: "text-lg" },
  { left: "18%", top: "62%", emoji: "🌺", size: "text-lg" },
  { left: "68%", top: "58%", emoji: "🌷", size: "text-base" },
  { left: "42%", top: "12%", emoji: "🌸", size: "text-sm" },
  { left: "55%", top: "68%", emoji: "🌼", size: "text-base" },
  { left: "30%", top: "35%", emoji: "🌺", size: "text-sm" },
  { left: "85%", top: "45%", emoji: "🌸", size: "text-sm" },
  { left: "5%", top: "45%", emoji: "🌷", size: "text-base" },
  { left: "72%", top: "35%", emoji: "🌼", size: "text-sm" },
];

export const SkyIslandPremiumScene = memo(function SkyIslandPremiumScene({
  evolution,
  wobble,
  weather,
  stabilityTier,
  balanceZone,
  reduced,
  showParadise,
  flowerShake,
}: {
  evolution: IslandEvolution;
  wobble: number;
  weather: "calm" | "wind";
  stabilityTier: StabilityVisualTier;
  balanceZone: "balanced" | "wobbling" | "unstable";
  reduced: boolean;
  showParadise?: boolean;
  flowerShake?: boolean;
}) {
  const isStable = balanceZone === "balanced";
  const isUnstable = balanceZone === "unstable";
  const islandScale = showParadise ? evolution.scale * 1.08 : evolution.scale;
  const tilt = isUnstable ? wobble * 0.35 : isStable ? wobble * 0.08 : wobble * 0.18;

  return (
    <div className="relative flex flex-col items-center">
      {!reduced && evolution.rainbow && (
        <motion.div
          className="pointer-events-none absolute -top-16 left-1/2 h-20 w-56 -translate-x-1/2 rounded-full opacity-70"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(239,68,68,0.35), rgba(251,191,36,0.35), rgba(52,211,153,0.35), rgba(59,130,246,0.35), transparent)",
            clipPath: "ellipse(50% 40% at 50% 100%)",
          }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
          aria-hidden
        />
      )}

      {!reduced && (
        <>
          <motion.span
            className="pointer-events-none absolute -top-10 left-2 text-3xl opacity-45"
            animate={{ x: [0, 30, 0] }}
            transition={{ duration: 14, repeat: Infinity }}
            aria-hidden
          >
            ☁️
          </motion.span>
          <motion.span
            className="pointer-events-none absolute -top-8 right-2 text-2xl opacity-35"
            animate={{ x: [0, -25, 0] }}
            transition={{ duration: 11, repeat: Infinity, delay: 1 }}
            aria-hidden
          >
            ☁️
          </motion.span>
        </>
      )}

      {weather === "wind" && !reduced && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.span
              key={`wind-${i}`}
              className="pointer-events-none absolute text-lg opacity-50"
              style={{ top: `${15 + i * 18}%`, left: `${5 + i * 25}%` }}
              animate={{ x: [0, 50, 0], opacity: [0, 0.7, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
              aria-hidden
            >
              💨
            </motion.span>
          ))}
        </>
      )}

      {!reduced &&
        evolution.birds > 0 &&
        [...Array(evolution.birds)].map((_, i) => (
          <motion.span
            key={`bird-${i}`}
            className="pointer-events-none absolute text-lg"
            style={{ top: `${5 + i * 8}%`, left: `${15 + i * 18}%` }}
            animate={{ x: [-20, 80, -20], y: [0, -6, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, delay: i * 0.8 }}
            aria-hidden
          >
            🐦
          </motion.span>
        ))}

      <motion.div
        className="relative will-change-transform"
        animate={{
          rotate: tilt,
          x: isUnstable && !reduced ? [wobble, wobble + 4, wobble - 4, wobble] : wobble * 1.5,
          y: wobble * 0.4,
        }}
        transition={
          isUnstable && !reduced
            ? { duration: 0.12, repeat: Infinity }
            : { type: "spring", stiffness: 160, damping: 14 }
        }
        style={{ scale: islandScale }}
      >
        {isStable && !reduced && (
          <motion.div
            className="pointer-events-none absolute -inset-8 rounded-[50%] bg-emerald-400/25 blur-2xl"
            animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.06, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            aria-hidden
          />
        )}

        <div
          className={cn(
            "relative h-44 w-72 rounded-[50%] border border-white/25 sm:h-48 sm:w-80",
            "bg-gradient-to-br from-emerald-300/95 via-teal-500/90 to-cyan-700/85",
            isStable
              ? "shadow-[0_28px_70px_-20px_rgba(16,185,129,0.75),inset_0_8px_24px_rgba(255,255,255,0.2)]"
              : "shadow-[0_28px_70px_-20px_rgba(16,185,129,0.4),inset_0_8px_24px_rgba(255,255,255,0.08)]",
            showParadise && "health-lab-island-rise",
          )}
        >
          <div className="absolute inset-x-8 top-4 h-8 rounded-full bg-white/10 blur-md" aria-hidden />

          {FLOWER_POSITIONS.slice(0, evolution.flowers).map((f, i) => (
            <motion.span
              key={i}
              className={cn("absolute", f.size)}
              style={{ left: f.left, top: f.top }}
              animate={
                flowerShake && !reduced
                  ? { x: [-2, 2, -2], rotate: [-5, 5, -5] }
                  : isStable && !reduced
                    ? { scale: [1, 1.08, 1], y: [0, -2, 0] }
                    : {}
              }
              transition={{
                duration: flowerShake ? 0.25 : 2.5,
                repeat: Infinity,
                delay: i * 0.15,
              }}
              aria-hidden
            >
              {f.emoji}
            </motion.span>
          ))}

          {!reduced &&
            evolution.butterflies > 0 &&
            [...Array(evolution.butterflies)].map((_, i) => (
              <motion.span
                key={`bf-${i}`}
                className="absolute text-base"
                style={{ left: `${25 + i * 12}%`, top: `${28 + (i % 3) * 15}%` }}
                animate={{ x: [0, 12, -8, 0], y: [0, -10, 0] }}
                transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, delay: i * 0.5 }}
                aria-hidden
              >
                🦋
              </motion.span>
            ))}

          <SkyIslandFlamingo
            stabilityTier={stabilityTier}
            balanceZone={balanceZone}
            reduced={reduced}
          />
        </div>

        <div
          className="absolute -bottom-3 left-1/2 h-10 w-64 -translate-x-1/2 rounded-[100%] bg-black/30 blur-xl"
          aria-hidden
        />
      </motion.div>
    </div>
  );
});

function SkyIslandFlamingo({
  stabilityTier,
  balanceZone,
  reduced,
}: {
  stabilityTier: StabilityVisualTier;
  balanceZone: "balanced" | "wobbling" | "unstable";
  reduced: boolean;
}) {
  const celebrating = stabilityTier === "perfect";
  const wobbling = balanceZone === "wobbling" || balanceZone === "unstable";

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      animate={
        reduced
          ? {}
          : {
              y: celebrating ? [0, -6, -2, -6, 0] : [0, -3, 0],
              scale: [1, 1.02, 1],
              rotate: wobbling ? [-4, 4, -3, 3, 0] : celebrating ? [-2, 2, 0] : [-1, 1, 0],
            }
      }
      transition={{
        duration: celebrating ? 1.2 : wobbling ? 0.35 : 2.4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.span
        className="relative block text-6xl drop-shadow-lg"
        animate={
          !reduced
            ? {
                scaleY: [1, 1.03, 1],
              }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity }}
        aria-hidden
      >
        🦩
      </motion.span>

      {!reduced && celebrating && (
        <motion.span
          className="absolute -right-4 -top-2 text-lg"
          animate={{ rotate: [0, 15, -10, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          aria-hidden
        >
          ✨
        </motion.span>
      )}

      {!reduced && wobbling && (
        <motion.span
          className="absolute -left-3 top-0 text-sm"
          animate={{ x: [-2, 2, -2] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          aria-hidden
        >
          💫
        </motion.span>
      )}
    </motion.div>
  );
}
