import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { REACTOR_STATE_COLORS, type ReactorState } from "./crystal-reactor-constants";

export const CrystalReactorCore = memo(function CrystalReactorCore({
  active,
  reactorState,
  ringScale,
  brightness,
  targetOffset,
  fingerOffset,
  reduced,
  shake,
}: {
  active: boolean;
  reactorState: ReactorState;
  ringScale: number;
  brightness: number;
  targetOffset: { x: number; y: number };
  fingerOffset: { x: number; y: number };
  reduced: boolean;
  shake?: boolean;
}) {
  const colors = REACTOR_STATE_COLORS[reactorState];
  const coreX = targetOffset.x + fingerOffset.x * 0.08;
  const coreY = targetOffset.y + fingerOffset.y * 0.08;

  return (
    <div
      className={cn(
        "relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80",
        shake && !reduced && "health-lab-reactor-shake",
      )}
    >
      {!reduced && active && (
        <>
          <motion.div
            className={cn("absolute inset-0 rounded-full border-2 opacity-40", colors.ring)}
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{ rotate: { duration: 10, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity } }}
            aria-hidden
          />
          <motion.div
            className="absolute inset-4 rounded-full border border-cyan-400/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            aria-hidden
          />
          <motion.div
            className="absolute inset-8 rounded-full border border-violet-400/15 border-dashed"
            animate={{ rotate: 360, opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            aria-hidden
          />
        </>
      )}

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
        style={{
          width: 240 * ringScale,
          height: 240 * ringScale,
          boxShadow: `0 0 ${60 * brightness}px ${colors.glow}`,
        }}
        aria-hidden
      />

      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ x: coreX, y: coreY }}
        animate={
          active && !reduced
            ? { rotate: [0, 6, -6, 0], scale: [1, 1.04, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={
          active && !reduced
            ? { rotate: { duration: 4, repeat: Infinity }, scale: { duration: 1.8, repeat: Infinity } }
            : { duration: 0.2 }
        }
      >
        <div
          className={cn(
            "relative flex h-32 w-32 items-center justify-center sm:h-36 sm:w-36",
            "rotate-45 rounded-2xl border-2 bg-gradient-to-br shadow-2xl",
            colors.ring,
            colors.core,
          )}
          style={{
            boxShadow: `0 0 ${48 * brightness}px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.15)`,
            clipPath: "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)",
          }}
        >
          <div className="absolute inset-2 rotate-[-45deg] rounded-xl bg-white/10 blur-sm" aria-hidden />
          {!reduced && active && (
            <>
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-transparent via-cyan-200/30 to-transparent"
                animate={{ opacity: [0.2, 0.7, 0.2], y: ["-20%", "20%", "-20%"] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                aria-hidden
              />
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute text-sm text-white/80"
                  style={{ left: `${30 + i * 20}%`, top: `${20 + i * 15}%` }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
                  aria-hidden
                >
                  ✦
                </motion.span>
              ))}
            </>
          )}
          <span className="rotate-[-45deg] text-4xl drop-shadow-lg" aria-hidden>
            💎
          </span>
        </div>
      </motion.div>

      {!reduced && active && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.span
              key={`shard-${i}`}
              className="absolute text-xs"
              style={{ left: `${15 + i * 10}%`, top: `${20 + (i % 4) * 18}%` }}
              animate={{ opacity: [0, 0.9, 0], y: [0, -24, -48], x: [0, (i % 2 ? 8 : -8), 0] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18 }}
              aria-hidden
            >
              {["⚡", "✨", "💎", "✦"][i % 4]}
            </motion.span>
          ))}
        </>
      )}
    </div>
  );
});

export const CrystalReactorEnergyBeam = memo(function CrystalReactorEnergyBeam({
  active,
  fingerOffset,
  reduced,
}: {
  active: boolean;
  fingerOffset: { x: number; y: number };
  reduced: boolean;
}) {
  if (!active || reduced) return null;

  const angle = Math.atan2(-fingerOffset.y, -fingerOffset.x) * (180 / Math.PI) + 90;
  const length = Math.min(180, Math.sqrt(fingerOffset.x ** 2 + fingerOffset.y ** 2) * 0.6 + 80);

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center" aria-hidden>
      <motion.div
        className="absolute bottom-[18%] left-1/2 w-1 origin-bottom rounded-full bg-gradient-to-t from-cyan-300 via-violet-400 to-transparent"
        style={{
          height: length,
          transform: `translateX(-50%) rotate(${angle}deg)`,
          boxShadow: "0 0 12px rgba(34,211,238,0.8)",
        }}
        animate={{ opacity: [0.4, 0.9, 0.4], scaleX: [1, 1.5, 1] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="absolute bottom-[20%] left-1/2 text-sm"
          animate={{
            y: [-20, -length * 0.85],
            opacity: [0, 1, 0],
            x: fingerOffset.x * 0.15 * (i % 2 ? 1 : -1),
          }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeOut" }}
        >
          ⚡
        </motion.span>
      ))}
    </div>
  );
});
