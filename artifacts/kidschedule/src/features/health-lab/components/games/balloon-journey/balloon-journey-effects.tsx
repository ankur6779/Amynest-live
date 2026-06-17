import { memo, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BalloonJourneyToast = memo(function BalloonJourneyToast({
  message,
}: {
  message: string | null;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[18%] z-[5] -translate-x-1/2">
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            className="whitespace-nowrap rounded-2xl border border-amber-300/35 bg-amber-500/20 px-5 py-2.5 text-lg font-bold text-amber-50 shadow-[0_0_40px_-8px_rgba(251,191,36,0.55)] backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.7, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -12 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const BalloonJourneyParticles = memo(function BalloonJourneyParticles({
  holding,
  intensity,
  reduced,
}: {
  holding: boolean;
  intensity: number;
  reduced: boolean;
}) {
  const count = reduced ? 0 : Math.min(16, 4 + Math.floor(intensity * 12));
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 35 + (i * 17) % 30,
        delay: (i % 5) * 0.15,
        symbol: ["✨", "⭐", "·", "✦", "💫"][i % 5],
      })),
    [count],
  );

  if (!holding || count === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-sm text-white/80"
          style={{ left: `${p.left}%`, bottom: "28%" }}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], y: -120 - intensity * 40, scale: [0.5, 1, 0.3] }}
          transition={{
            duration: 1.2 + intensity * 0.6,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
          }}
        >
          {p.symbol}
        </motion.span>
      ))}
    </div>
  );
});

export const BalloonJourneyEnergyStream = memo(function BalloonJourneyEnergyStream({
  holding,
  reduced,
}: {
  holding: boolean;
  reduced: boolean;
}) {
  if (!holding || reduced) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-[5.5rem] left-1/2 z-[4] h-[38%] w-16 -translate-x-1/2"
      aria-hidden
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 text-base -translate-x-1/2"
          style={{ bottom: 0 }}
          animate={{
            y: [0, -280],
            opacity: [0, 0.9, 0],
            scale: [0.6, 1.1, 0.4],
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeOut",
          }}
        >
          ✨
        </motion.span>
      ))}
      <motion.div
        className="absolute bottom-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-gradient-to-t from-cyan-300/80 via-violet-400/50 to-transparent"
        style={{ height: "100%" }}
        animate={{ opacity: [0.3, 0.7, 0.3], scaleX: [1, 1.4, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </div>
  );
});

export const BalloonJourneyMilestoneBurst = memo(function BalloonJourneyMilestoneBurst({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  if (!active || reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]" aria-hidden>
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[38%] text-xl"
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [1, 0],
            scale: [0, 1.5],
            x: Math.cos((i / 12) * Math.PI * 2) * 80,
            y: Math.sin((i / 12) * Math.PI * 2) * 80,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {["✨", "⭐", "🎈", "💫"][i % 4]}
        </motion.span>
      ))}
    </div>
  );
});

export const BalloonJourneyPressHint = memo(function BalloonJourneyPressHint({
  visible,
  reduced,
}: {
  visible: boolean;
  reduced: boolean;
}) {
  if (!visible || reduced) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-[9.5rem] left-1/2 z-[4] flex -translate-x-1/2 flex-col items-center"
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="text-lg text-cyan-200/80"
          animate={{ y: [0, -18, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        >
          ↑
        </motion.span>
      ))}
      <motion.p
        className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55"
        animate={{ opacity: [0.45, 0.9, 0.45] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        Hold to fly
      </motion.p>
    </div>
  );
});

export const BalloonJourneyVictory = memo(function BalloonJourneyVictory({
  show,
  holdSeconds,
  isPersonalBest,
  reduced,
  onDismiss,
}: {
  show: boolean;
  holdSeconds: number;
  isPersonalBest?: boolean;
  reduced: boolean;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm",
            !reduced && "health-lab-balloon-victory-shake",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {!reduced && (
            <>
              {[...Array(16)].map((_, i) => (
                <motion.span
                  key={`star-burst-${i}`}
                  className="pointer-events-none absolute left-1/2 top-1/2 text-3xl"
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [1, 0.6, 0],
                    scale: [0, 2, 2.5],
                    x: Math.cos((i / 16) * Math.PI * 2) * 140,
                    y: Math.sin((i / 16) * Math.PI * 2) * 140,
                  }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                >
                  ⭐
                </motion.span>
              ))}
              {[...Array(20)].map((_, i) => (
                <motion.span
                  key={`confetti-${i}`}
                  className="pointer-events-none absolute text-2xl"
                  style={{ left: `${(i * 13) % 100}%`, top: `${(i * 7) % 40}%` }}
                  initial={{ y: -20, opacity: 0, rotate: 0 }}
                  animate={{ y: 400, opacity: [0, 1, 0], rotate: 360 }}
                  transition={{ duration: 2, delay: i * 0.05 }}
                >
                  {["🎉", "⭐", "✨", "🚀", "🌟"][i % 5]}
                </motion.span>
              ))}
            </>
          )}

          <motion.div
            className="relative max-w-sm rounded-3xl border border-violet-300/30 bg-gradient-to-br from-indigo-950/95 via-violet-950/95 to-slate-950/95 p-8 text-center shadow-[0_24px_80px_-20px_rgba(139,92,246,0.65)]"
            initial={{ scale: 0.6, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <p className="text-5xl" aria-hidden>
              🚀
            </p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">SPACE EXPLORER</h2>
            <p className="mt-3 text-sm text-violet-200/75">You held for:</p>
            <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-amber-200">
              {holdSeconds.toFixed(1)} Seconds
            </p>
            {isPersonalBest && (
              <p className="mt-4 inline-flex rounded-full border border-amber-300/35 bg-amber-500/20 px-4 py-1.5 text-sm font-bold text-amber-100">
                NEW BEST SCORE
              </p>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="mt-6 min-h-[48px] rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-8 py-3 text-sm font-bold text-white"
            >
              Amazing!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
