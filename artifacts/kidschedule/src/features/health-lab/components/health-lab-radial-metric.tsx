import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";

const STROKE_COLORS: Record<string, string> = {
  "from-violet-500 to-purple-600": "#a78bfa",
  "from-pink-500 to-rose-500": "#f472b6",
  "from-teal-400 to-cyan-500": "#2dd4bf",
  "from-amber-400 to-orange-500": "#fbbf24",
  "from-indigo-400 to-blue-500": "#818cf8",
};

interface Props {
  value: number;
  label: string;
  emoji: string;
  gradient: string;
  delay?: number;
}

export function HealthLabRadialMetric({
  value,
  label,
  emoji,
  gradient,
  delay = 0,
}: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const size = 88;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - pct / 100);
  const strokeColor = STROKE_COLORS[gradient] ?? "#a78bfa";

  useEffect(() => {
    if (reduced) {
      setDisplay(pct);
      return;
    }
    const start = Date.now();
    const duration = 800;
    const id = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setDisplay(Math.round(pct * t));
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [pct, reduced]);

  return (
    <motion.div
      className={cn("health-lab-timer-glass flex flex-col items-center rounded-2xl p-4")}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={strokeColor}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 4px ${strokeColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg" aria-hidden>{emoji}</span>
          <span className="font-mono text-lg font-bold tabular-nums text-white">{display}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-white/80">{label}</p>
    </motion.div>
  );
}
