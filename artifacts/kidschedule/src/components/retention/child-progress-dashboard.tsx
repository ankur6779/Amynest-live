import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";

type Axis = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type Props = {
  learning?: number;
  speech?: number;
  creativity?: number;
  health?: number;
  nutrition?: number;
  behavior?: number;
  sleep?: number;
};

const RING_SIZE = 52;

function GrowthRing({
  value,
  color,
  label,
  reduceMotion,
}: {
  value: number;
  color: string;
  label: string;
  reduceMotion: boolean | null;
}) {
  const pct = Math.round(Math.max(0, Math.min(100, value)));
  const r = (RING_SIZE - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div
      className="flex w-[4.25rem] flex-col items-center gap-1.5"
      role="group"
      aria-label={`${label} ${pct}%`}
    >
      <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="4"
          />
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={reduceMotion ? { strokeDashoffset: offset } : { strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-white">
          {pct}
        </span>
      </div>
      <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-white/60">
        {label}
      </span>
    </div>
  );
}

export function ChildProgressDashboard({
  learning = 0,
  speech = 0,
  creativity = 0,
  health = 0,
  nutrition = 0,
  behavior = 0,
  sleep = 0,
}: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const axes: Axis[] = [
    { key: "learning", label: t("retention.progress_learning", "Learning"), value: learning, color: "#60a5fa" },
    { key: "speech", label: t("retention.progress_speech", "Speech"), value: speech, color: "#a78bfa" },
    { key: "creativity", label: t("retention.progress_creativity", "Creativity"), value: creativity, color: "#f472b6" },
    { key: "health", label: t("retention.progress_health", "Health"), value: health, color: "#34d399" },
    { key: "nutrition", label: t("retention.progress_nutrition", "Nutrition"), value: nutrition, color: "#fbbf24" },
    { key: "behavior", label: t("retention.progress_behavior", "Behavior"), value: behavior, color: "#fb7185" },
    { key: "sleep", label: t("retention.progress_sleep", "Sleep"), value: sleep, color: "#818cf8" },
  ];

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.insights}>
      <div className="p-4 space-y-3" data-testid="child-progress-dashboard">
        <p className="text-sm font-bold text-white">
          {t("retention.child_growth", "Your child's growth")}
        </p>
        <div className="flex flex-col items-center gap-3 sm:hidden">
          <div className="grid w-full grid-cols-4 justify-items-center gap-x-1">
            {axes.slice(0, 4).map((axis) => (
              <GrowthRing
                key={axis.key}
                value={axis.value}
                color={axis.color}
                label={axis.label}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 justify-items-center gap-x-1">
            {axes.slice(4).map((axis) => (
              <GrowthRing
                key={axis.key}
                value={axis.value}
                color={axis.color}
                label={axis.label}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>
        <div className="hidden sm:grid sm:grid-cols-7 sm:justify-items-center sm:gap-x-2">
          {axes.map((axis) => (
            <GrowthRing
              key={axis.key}
              value={axis.value}
              color={axis.color}
              label={axis.label}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>
    </DashboardGlassCard>
  );
}
