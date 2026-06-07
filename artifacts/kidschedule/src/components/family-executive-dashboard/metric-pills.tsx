import { BookOpen, CalendarCheck, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HubMetricCard, HubRoutedAction } from "./types";

interface MetricPillsProps {
  learning: HubMetricCard;
  routine: HubMetricCard;
  onMetricTap?: (action: HubRoutedAction, label: string) => void;
  variant?: "default" | "dark";
}

export function MetricPills({ learning, routine, onMetricTap, variant = "default" }: MetricPillsProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-wrap gap-2"
      role="list"
      aria-label={t("parent_hub.executive.metrics_label", { defaultValue: "Weekly metrics" })}
    >
      <MetricPill
        icon={BookOpen}
        label={t("parent_hub.executive.learning_progress", { defaultValue: "Learning" })}
        card={learning}
        onTap={onMetricTap}
        variant={variant}
      />
      <MetricPill
        icon={CalendarCheck}
        label={t("parent_hub.executive.routine_consistency", { defaultValue: "Routine" })}
        card={routine}
        onTap={onMetricTap}
        variant={variant}
      />
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  card,
  onTap,
  variant,
}: {
  icon: LucideIcon;
  label: string;
  card: HubMetricCard;
  onTap?: (action: HubRoutedAction, label: string) => void;
  variant: "default" | "dark";
}) {
  const safe = Math.max(0, Math.min(100, Math.round(card.pct)));
  const shell =
    variant === "dark"
      ? "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5"
      : "inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5";

  const inner = (
    <>
      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <span className={`text-[11px] font-semibold ${variant === "dark" ? "text-white" : "text-foreground"}`}>
        {label}
      </span>
      <span className={`text-[11px] font-black tabular-nums ${variant === "dark" ? "text-white/90" : "text-primary"}`}>
        {safe}%
      </span>
    </>
  );

  if (onTap) {
    return (
      <button
        type="button"
        role="listitem"
        className={`${shell} hover:opacity-90 transition-opacity`}
        aria-label={`${label} ${safe} percent — open details`}
        onClick={() => onTap(card.action, label)}
      >
        {inner}
      </button>
    );
  }

  return (
    <div role="listitem" className={shell} aria-label={`${label} ${safe} percent`}>
      {inner}
    </div>
  );
}
