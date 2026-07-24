import { memo, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHealthLabDialogEscape } from "../../../hooks/use-health-lab-dialog-escape";

export const SkyIslandToast = memo(function SkyIslandToast({
  message,
}: {
  message: string | null;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[12%] z-[6] -translate-x-1/2">
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            className="whitespace-nowrap rounded-2xl border border-emerald-300/35 bg-emerald-500/20 px-5 py-2.5 text-lg font-bold text-emerald-50 shadow-[0_0_40px_-8px_rgba(52,211,153,0.55)] backdrop-blur-md"
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

export const SkyIslandEncouragement = memo(function SkyIslandEncouragement({
  visible,
}: {
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[22%] z-[6] max-w-xs -translate-x-1/2 px-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <p className="rounded-2xl border border-rose-300/30 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-50 backdrop-blur-md">
            Oh no! The island needs your help again! 🌸
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export const SkyIslandParticles = memo(function SkyIslandParticles({
  active,
  intensity,
  tier,
  reduced,
}: {
  active: boolean;
  intensity: number;
  tier: "perfect" | "slight" | "wobble" | "danger";
  reduced: boolean;
}) {
  const count = useMemo(() => {
    if (!active || reduced || tier === "danger") return 0;
    return Math.min(14, 3 + Math.floor(intensity * 10));
  }, [active, intensity, reduced, tier]);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 15 + (i * 19) % 70,
        top: 10 + (i * 23) % 60,
        symbol: ["✨", "🦋", "🌸", "🌈", "⭐"][i % 5],
        delay: (i % 4) * 0.3,
      })),
    [count],
  );

  if (count === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-base opacity-80"
          style={{ left: `${p.left}%`, top: `${p.top}%` }}
          animate={{
            y: [0, -12, 0],
            x: [0, 8, -6, 0],
            opacity: tier === "wobble" ? [0.3, 0.6, 0.3] : [0.4, 1, 0.4],
            rotate: [0, 10, -10, 0],
          }}
          transition={{ duration: 3 + p.delay, repeat: Infinity, delay: p.delay }}
        >
          {p.symbol}
        </motion.span>
      ))}
    </div>
  );
});

export const SkyIslandMilestoneBurst = memo(function SkyIslandMilestoneBurst({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  if (!active || reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[42%] text-xl"
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [1, 0],
            scale: [0, 1.5],
            x: Math.cos((i / 12) * Math.PI * 2) * 90,
            y: Math.sin((i / 12) * Math.PI * 2) * 70,
          }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        >
          {["🌸", "🦋", "✨", "🌈"][i % 4]}
        </motion.span>
      ))}
    </div>
  );
});

export const SkyIslandVictory = memo(function SkyIslandVictory({
  show,
  elapsed,
  legendary,
  reduced,
  onDismiss,
}: {
  show: boolean;
  elapsed: number;
  legendary: boolean;
  reduced: boolean;
  onDismiss: () => void;
}) {
  const dismissRef = useRef<HTMLButtonElement>(null);
  useHealthLabDialogEscape(show, onDismiss, dismissRef);

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
          role="dialog"
          aria-modal="true"
          aria-labelledby="sky-island-victory-title"
        >
          {!reduced && (
            <>
              <motion.div
                className="pointer-events-none absolute inset-x-0 top-[15%] h-24 bg-gradient-to-r from-red-400/40 via-yellow-300/50 to-blue-400/40 blur-sm"
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.8 }}
                aria-hidden
              />
              {[...Array(24)].map((_, i) => (
                <motion.span
                  key={`confetti-${i}`}
                  className="pointer-events-none absolute text-2xl"
                  style={{ left: `${(i * 11) % 100}%`, top: `${(i * 9) % 35}%` }}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 420, opacity: [0, 1, 0], rotate: 360 }}
                  transition={{ duration: 2.2, delay: i * 0.04 }}
                >
                  {["🎉", "🌸", "🦋", "🌈", "⭐"][i % 5]}
                </motion.span>
              ))}
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={`butterfly-${i}`}
                  className="pointer-events-none absolute left-1/2 top-1/2 text-3xl"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [1, 0],
                    scale: [0, 1.8],
                    x: Math.cos((i / 8) * Math.PI * 2) * 120,
                    y: Math.sin((i / 8) * Math.PI * 2) * 100,
                  }}
                  transition={{ duration: 1.2, delay: 0.2 + i * 0.05 }}
                >
                  🦋
                </motion.span>
              ))}
            </>
          )}

          <motion.div
            className="relative max-w-sm rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-950/95 via-teal-950/95 to-cyan-950/95 p-8 text-center shadow-[0_24px_80px_-20px_rgba(16,185,129,0.55)]"
            initial={{ scale: 0.6, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <p className="text-5xl" aria-hidden>
              {legendary ? "🏆" : "👑"}
            </p>
            <h2 id="sky-island-victory-title" className="mt-4 text-2xl font-bold tracking-tight text-white">
              {legendary ? "Legendary Balance Master" : "Sky Kingdom Protector"}
            </h2>
            <p className="mt-3 text-sm text-emerald-200/75">You kept the island alive for</p>
            <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-amber-200">
              {elapsed.toFixed(0)} Seconds
            </p>
            <p className="mt-3 text-sm text-emerald-100/70">The floating paradise is blooming! 🌈</p>
            <button
              ref={dismissRef}
              type="button"
              onClick={onDismiss}
              className="mt-6 min-h-[48px] min-w-[48px] rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 text-sm font-bold text-white"
            >
              Amazing!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
