import { motion, useReducedMotion } from "framer-motion";
import { MOTION_MS, RADIUS } from "@/lib/experience-system";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
};

/** Animated fill bar for completion / progress metrics. */
export function AnimatedProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: Props) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden bg-white/15",
        RADIUS.sm,
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full bg-gradient-to-r from-amber-400 to-orange-400", barClassName)}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: MOTION_MS.slow / 1000, ease: [0.22, 1, 0.36, 1] }
        }
      />
    </div>
  );
}
