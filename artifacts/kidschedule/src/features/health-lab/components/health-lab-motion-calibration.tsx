import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";

interface Props {
  progress: number;
  onComplete?: () => void;
}

export function HealthLabMotionCalibration({ progress }: Props) {
  const reduced = useReducedMotion();
  const pct = Math.round(progress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f2e]/95 backdrop-blur-xl">
      <motion.div
        className="mx-4 flex max-w-sm flex-col items-center rounded-3xl border border-white/15 bg-white/[0.06] p-8 text-center backdrop-blur-2xl"
        initial={reduced ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-cyan-400/40 bg-gradient-to-br from-violet-500/20 to-cyan-500/20"
          animate={reduced ? {} : { rotate: [0, -3, 3, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Smartphone className="h-10 w-10 text-cyan-200" aria-hidden />
          {!reduced && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-cyan-300/30"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              aria-hidden
            />
          )}
        </motion.div>

        <h2 className="mt-6 text-xl font-bold text-white">HOLD DEVICE STILL</h2>
        <p className="mt-2 text-sm text-violet-200/70">
          Amy is calibrating your motion sensors…
        </p>

        <div className="mt-6 w-full">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
              style={{ width: `${pct}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>
          <p className="mt-2 font-mono text-sm tabular-nums text-white/60">{pct}%</p>
        </div>

        <p className={cn("mt-4 text-xs text-white/40", pct >= 100 && "text-emerald-300/80")}>
          {pct < 100 ? "Keep the phone flat and steady" : "Calibration complete!"}
        </p>
      </motion.div>
    </div>
  );
}
