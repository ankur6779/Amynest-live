import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { HUB_COLLAPSIBLE, HUB_EXPLORE_CARD, HUB_CARD_TITLE, HUB_BODY } from "@/lib/parent-hub-premium";
import { ContinueJourneyCard } from "@/components/continue-journey-card";
import { RealityDashboardPanel } from "@/components/reality-dashboard/reality-dashboard-panel";
import { FamilyExecutiveDashboard } from "@/components/family-executive-dashboard";

export function HubCollapsiblePanel({
  title,
  subtitle,
  defaultOpen = false,
  children,
  testId,
  icon,
  parentHub = false,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  testId?: string;
  icon?: ReactNode;
  parentHub?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        parentHub ? HUB_COLLAPSIBLE : "rounded-xl border border-border bg-card overflow-hidden",
      )}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-all duration-[220ms] ease-[ease]",
          parentHub ? "hover:bg-white/[0.04]" : "hover:bg-muted/30",
        )}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <p
              className={cn(
                "font-quicksand font-bold text-foreground",
                parentHub ? "text-lg" : "text-sm",
              )}
            >
              {title}
            </p>
            {!open && subtitle ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div
          className={cn(
            "px-3 pb-4 pt-1 space-y-3 animate-in fade-in duration-200",
            parentHub ? "border-t border-white/[0.08] hub-today-stack" : "border-t border-border",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function HubFamilyPulseSection({
  childId,
  childName,
}: {
  childId: number;
  childName: string;
}) {
  const { t } = useTranslation();

  return (
    <HubCollapsiblePanel
      title={t("parent_hub.family_pulse.title")}
      subtitle={t("parent_hub.family_pulse.preview")}
      icon={<Sparkles className="h-4 w-4 text-primary shrink-0" />}
      testId="hub-family-pulse"
    >
      <ContinueJourneyCard />
      <RealityDashboardPanel />
      <FamilyExecutiveDashboard childId={childId} childName={childName} />
    </HubCollapsiblePanel>
  );
}

export function HubExploreAgesSection({
  title,
  subtitle,
  children,
  testId,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  testId?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className={HUB_EXPLORE_CARD} data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-3 text-left transition-all duration-[220ms] ease-[ease] hover:bg-white/[0.04]"
        aria-expanded={open}
      >
        <div className="min-w-0 text-left">
          <p className={HUB_CARD_TITLE}>{title}</p>
          {!open ? <p className={cn(HUB_BODY, "line-clamp-1")}>{subtitle}</p> : null}
        </div>
        <span className="text-xs font-bold text-amber-300/90 shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1">
          {open ? t("parent_hub.explore_ages.hide") : t("parent_hub.explore_ages.show")}
        </span>
      </button>
      {open ? (
        <div className="px-3 pb-4 pt-1 border-t border-white/[0.08] animate-in fade-in duration-200">
          <p className={cn(HUB_BODY, "mb-3")}>{subtitle}</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
