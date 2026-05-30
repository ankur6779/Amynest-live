import { useTranslation } from "react-i18next";
import { AppLink } from "@/components/app-link";
import { useInfantToday } from "@/hooks/use-infant-today";
import { trackInfantHubEvent } from "@/lib/infant-hub-analytics";
import { dashboardGlassShellClasses } from "@/lib/dashboard-premium";
import { Moon, Flame, Target, ArrowRight } from "lucide-react";

type InfantDashboardShortcutProps = {
  childId: number;
  childName: string;
};

export function InfantDashboardShortcut({
  childId,
  childName,
}: InfantDashboardShortcutProps) {
  const { t } = useTranslation();
  const { data } = useInfantToday(childId);
  const tint = "244,114,182";

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
        onClick={() => trackInfantHubEvent("dashboard_shortcut_tap", { childId })}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">👶</span>
          <p className="font-bold text-foreground text-sm">
            {t("components.infant_dashboard.title", "{{name}} — Infant Care", { name: childName })}
          </p>
        </div>

        {data && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
            <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
              <Moon className="h-3 w-3 text-sky-400" />
              <span className="text-muted-foreground">{t("components.infant_dashboard.last_sleep", "Last sleep")}</span>
              <span className="font-bold text-foreground ml-auto">{data.lastSleep ?? "—"}</span>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
              <Flame className="h-3 w-3 text-orange-400" />
              <span className="text-muted-foreground">{t("components.infant_dashboard.last_feed", "Last feed")}</span>
              <span className="font-bold text-foreground ml-auto">{data.lastFeed ?? "—"}</span>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
              <Moon className="h-3 w-3 text-indigo-400" />
              <span className="text-muted-foreground">{t("components.infant_dashboard.next_nap", "Next nap")}</span>
              <span className="font-bold text-foreground ml-auto">{data.nextNap ?? "—"}</span>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
              <Target className="h-3 w-3 text-violet-400" />
              <span className="text-muted-foreground">{t("components.infant_dashboard.milestones", "Milestones")}</span>
              <span className="font-bold text-foreground ml-auto">{data.milestoneProgressPct}%</span>
            </div>
          </div>
        )}

        <p className="text-xs font-semibold text-primary flex items-center gap-1">
          {t("components.infant_dashboard.open", "Open Infant Hub")}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </AppLink>
    </div>
  );
}
