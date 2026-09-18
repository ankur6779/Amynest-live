import { motion } from "framer-motion";
import { ArrowLeft, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { isHealthLabLivingV1Enabled } from "@/lib/health-lab/living-room";
import { HEALTH_LAB_TOUCH_TARGET } from "../theme";

interface Props {
  progress: number;
  onCancel?: () => void;
  onComplete?: () => void;
}

export function HealthLabMotionCalibration({ progress, onCancel }: Props) {
  const reduced = useReducedMotion();
  const living = isHealthLabLivingV1Enabled();
  const pct = Math.round(progress);

  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 py-6"
      role="status"
      aria-live="polite"
      data-testid="health-lab-motion-calibration"
    >
      {onCancel ? (
        <button
          type="button"
          data-testid="health-lab-practice-exit"
          onClick={onCancel}
          className={cn(
            HEALTH_LAB_TOUCH_TARGET,
            "mb-6 inline-flex items-center gap-1.5 self-start rounded-full px-3.5 py-2 text-xs font-semibold",
            living
              ? "hl-living-deep-ghost-btn text-[rgba(255,252,248,0.92)]"
              : "border border-white/12 bg-white/[0.08] text-white/85",
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Exit
        </button>
      ) : null}
      <motion.div
        className={cn(
          "mx-4 flex w-full max-w-sm flex-col items-center p-8 text-center",
          living
            ? "hl-living-deep-panel rounded-3xl"
            : "rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-2xl",
        )}
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
