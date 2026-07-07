import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Check, Share2 } from "lucide-react";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import { trackRetentionEvent } from "@/lib/retention/retention-analytics";
import { notifyValueBridgeMoment } from "@/lib/value-bridge-notify";

type WeeklySummary = {
  routineCompletionPct?: number;
  learningMinutes?: number;
  storiesCompleted?: number;
  speechSessions?: number;
  nutritionScore?: number;
};

type Props = {
  summary?: Record<string, unknown> | null;
  parentingScore?: number;
};

export function WeeklySummaryCard({ summary, parentingScore = 0 }: Props) {
  const { t } = useTranslation();
  const s = (summary ?? {}) as WeeklySummary;
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    trackRetentionEvent("weekly_summary_viewed", {
      week_key: new Date().toISOString().slice(0, 10),
    });
  }, [parentingScore, s.routineCompletionPct]);

  const rows = [
    { label: t("retention.week_routine", "Routine completion"), value: `${s.routineCompletionPct ?? 0}%` },
    { label: t("retention.week_learning", "Learning minutes"), value: String(s.learningMinutes ?? 0) },
    { label: t("retention.week_stories", "Stories"), value: String(s.storiesCompleted ?? 0) },
    { label: t("retention.week_speech", "Speech sessions"), value: String(s.speechSessions ?? 0) },
    { label: t("retention.week_nutrition", "Nutrition score"), value: String(s.nutritionScore ?? "—") },
    { label: t("retention.week_parent_score", "Parenting score"), value: String(parentingScore) },
  ];

  const shareText = rows.map((r) => `${r.label}: ${r.value}`).join("\n");

  const handleClose = () => {
    if (closed) return;
    setClosed(true);
    notifyValueBridgeMoment("weekly_summary");
  };

  if (closed) {
    return null;
  }

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.journey}>
      <div className="p-4 space-y-3" data-testid="weekly-summary-card">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-sky-300" aria-hidden />
          <p className="text-sm font-bold text-white">{t("retention.weekly_summary", "Your week with Amy")}</p>
        </div>
        <ul className="space-y-1.5" role="list">
          {rows.map((row) => (
            <li key={row.label} className="flex justify-between text-xs text-white/80">
              <span>{row.label}</span>
              <span className="font-semibold text-white">{row.value}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 py-2.5 text-xs font-semibold text-white hover:bg-white/12"
          onClick={async () => {
            if (navigator.share) {
              await navigator.share({
                title: t("retention.share_title", "Our AmyNest week"),
                text: shareText,
              });
            } else {
              await navigator.clipboard.writeText(shareText);
            }
          }}
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          {t("retention.share_week", "Share your week")}
        </button>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/15 py-2.5 text-xs font-bold text-white hover:bg-sky-500/25"
          onClick={handleClose}
          data-testid="weekly-summary-done"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          {t("retention.weekly_summary_done", "Done")}
        </button>
      </div>
    </DashboardGlassCard>
  );
}
