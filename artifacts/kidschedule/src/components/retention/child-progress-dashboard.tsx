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

function ring(value: number, color: string, label: string, reduceMotion: boolean | null) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1" role="group" aria-label={`${label} ${pct}%`}>
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
        <motion.circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduceMotion ? { strokeDashoffset: offset } : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: "easeOut" }}
        />
      </svg>
      <span className="text-[9px] text-white/55 text-center leading-tight max-w-[4.5rem]">{label}</span>
      <span className="text-[10px] font-bold text-white -mt-3">{pct}</span>
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
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 justify-items-center">
          {axes.map((axis) => (
            <div key={axis.key}>{ring(axis.value, axis.color, axis.label, reduceMotion)}</div>
          ))}
        </div>
      </div>
    </DashboardGlassCard>
  );
}
