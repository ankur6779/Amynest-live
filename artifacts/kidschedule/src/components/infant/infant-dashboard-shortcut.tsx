import { useTranslation } from "react-i18next";
import { AppLink } from "@/components/app-link";
import { useInfantToday } from "@/hooks/use-infant-today";
import { useInfantActivation } from "@/hooks/use-infant-activation";
import { trackInfantDashboardShortcutTapped } from "@/lib/infant-hub-analytics";
import { dashboardGlassShellClasses } from "@/lib/dashboard-premium";
import { Moon, Flame, Target, ArrowRight, CheckCircle2, Circle } from "lucide-react";

type InfantDashboardShortcutProps = {
  childId: number;
  childName: string;
  ageMonths: number;
};

export function InfantDashboardShortcut({
  childId,
  childName,
  ageMonths,
}: InfantDashboardShortcutProps) {
  const { t } = useTranslation();
  const { data } = useInfantToday(childId);
  const { data: activation } = useInfantActivation(childId);
  const tint = "244,114,182";
  const showActivationMini = activation?.showActivation;

  return (
    <div
      data-testid="infant-dashboard-shortcut"
      className={dashboardGlassShellClasses(244, 114, 182)}
      style={{ background: `linear-gradient(135deg, rgba(${tint},0.12) 0%, rgba(15,23,42,0.4) 100%)` }}
    >
      <AppLink
        href="/parenting-hub#tile-infant-hub"
        source="dashboard-infant-shortcut"
        className="block p-4"
        onClick={() => trackInfantDashboardShortcutTapped(childId, ageMonths)}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">👶</span>
          <p className="font-bold text-foreground text-sm">
            {t("components.infant_dashboard.title", "{{name}} — Infant Care", { name: childName })}
          </p>
        </div>

        {showActivationMini && activation ? (
          <div className="mb-3 space-y-2">
            <p className="text-[11px] font-semibold text-foreground/90">
              {t("components.infant_dashboard.activation_title", "Build your first baby plan")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {activation.completedCount} / {activation.totalSteps}{" "}
              {t("components.infant_dashboard.activation_progress", "steps complete")}
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {(
                [
                  ["feed", t("components.infant_dashboard.step_feed", "Feed")],
                  ["sleep", t("components.infant_dashboard.step_sleep", "Sleep")],
                  ["weight", t("components.infant_dashboard.step_weight", "Weight")],
                  ["cry", t("components.infant_dashboard.step_cry", "Cry")],
                ] as const
              ).map(([id, label]) => (
                <div
                  key={id}
                  className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 flex items-center gap-1"
                >
                  {activation.steps[id] ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-foreground/90">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          data && (
            <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
                <Moon className="h-3 w-3 text-sky-400" />
                <span className="text-muted-foreground">{t("components.infant_dashboard.last_sleep", "Last sleep")}</span>
                <span className="font-bold text-foreground ml-auto truncate max-w-[72px]">
                  {activation?.steps.sleep ? (data.lastSleep ?? "—") : t("components.infant_dashboard.preview_sleep", "Log sleep")}
                </span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="text-muted-foreground">{t("components.infant_dashboard.last_feed", "Last feed")}</span>
                <span className="font-bold text-foreground ml-auto truncate max-w-[72px]">
                  {activation?.steps.feed ? (data.lastFeed ?? "—") : t("components.infant_dashboard.preview_feed", "Log feed")}
                </span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
                <Moon className="h-3 w-3 text-indigo-400" />
                <span className="text-muted-foreground">{t("components.infant_dashboard.next_nap", "Next nap")}</span>
                <span className="font-bold text-foreground ml-auto truncate max-w-[72px]">
                  {activation?.steps.sleep
                    ? (data.nextNap ?? "—")
                    : t("components.infant_dashboard.preview_nap", "After sleep log")}
                </span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
                <Target className="h-3 w-3 text-violet-400" />
                <span className="text-muted-foreground">{t("components.infant_dashboard.milestones", "Milestones")}</span>
                <span className="font-bold text-foreground ml-auto">{data.milestoneProgressPct}%</span>
              </div>
            </div>
          )
        )}

        <p className="text-xs font-semibold text-primary flex items-center gap-1">
          {showActivationMini
            ? t("components.infant_dashboard.continue_activation", "Continue setup")
            : t("components.infant_dashboard.open", "Open Infant Hub")}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </AppLink>
    </div>
  );
}
