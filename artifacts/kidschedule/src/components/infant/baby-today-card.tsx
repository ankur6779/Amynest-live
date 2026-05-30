import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Baby, Moon, Flame, Activity, Syringe, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInfantToday } from "@/hooks/use-infant-today";
import { trackInfantHubEvent } from "@/lib/infant-hub-analytics";

type BabyTodayCardProps = {
  childId: number;
  childName: string;
  onViewFullPlan?: () => void;
  compact?: boolean;
};

export function BabyTodayCard({
  childId,
  childName,
  onViewFullPlan,
  compact = false,
}: BabyTodayCardProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useInfantToday(childId);

  useEffect(() => {
    if (data) trackInfantHubEvent("baby_today_view", { childId, surface: compact ? "dashboard" : "hub" });
  }, [childId, compact, data]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 flex items-center justify-center min-h-[140px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-muted-foreground">
        {t("components.baby_today.unavailable", "Today's plan will appear after you log sleep or feeds.")}
      </div>
    );
  }

  const rows = [
    { icon: Moon, label: t("components.baby_today.next_nap", "Next Nap"), value: data.nextNap ?? "—" },
    { icon: Flame, label: t("components.baby_today.next_feed", "Next Feed"), value: data.nextFeed ?? "—" },
    {
      icon: Activity,
      label: t("components.baby_today.activity", "Activity"),
      value: data.activity ? `${data.activity.emoji} ${data.activity.title}` : "—",
    },
    { icon: Syringe, label: t("components.baby_today.vaccine", "Vaccine"), value: data.vaccineStatus },
    { icon: Sparkles, label: t("components.baby_today.sleep_score", "Sleep Score"), value: data.sleepScore },
  ];

  return (
    <div
      data-testid="baby-today-card"
      className={[
        "relative overflow-hidden rounded-3xl border border-violet-400/25",
        "bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent",
        "backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(168,85,247,0.35)]",
        compact ? "p-4" : "p-5",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative flex items-start gap-3 mb-4">
        <div className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg ring-1 ring-white/20">
          <Baby className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/90">
            {t("components.baby_today.label", "Today for {{name}}", { name: childName })}
          </p>
          {!compact && data.cryInsightHint && (
            <p className="text-[11px] text-muted-foreground mt-1">{data.cryInsightHint}</p>
          )}
        </div>
      </div>

      <ul className="relative space-y-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            <Icon className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <span className="text-muted-foreground min-w-[88px]">{label}</span>
            <span className="font-semibold text-foreground truncate">{value}</span>
          </li>
        ))}
      </ul>

      {onViewFullPlan && (
        <Button
          type="button"
          onClick={() => {
            trackInfantHubEvent("baby_today_cta", { childId });
            onViewFullPlan();
          }}
          className="relative mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold gap-2"
        >
          {t("components.baby_today.view_plan", "View Full Plan")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
