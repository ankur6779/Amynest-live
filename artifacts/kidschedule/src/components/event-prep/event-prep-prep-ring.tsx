import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Amber-themed circular prep progress ring. */
export function EventPrepPrepRing({
  done,
  total,
  size = 56,
  className,
}: {
  done: number;
  total: number;
  size?: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (c * Math.min(100, pct)) / 100;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="stroke-white/15"
          strokeWidth="4"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="stroke-amber-400"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ strokeDasharray: c }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-[10px] font-bold text-amber-200">
        <span>{pct}%</span>
      </span>
    </div>
  );
}
