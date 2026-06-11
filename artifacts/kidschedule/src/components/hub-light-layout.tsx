import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { HubShadedCardBody } from "@/components/hub-sub-tile-shell";
import { cn } from "@/lib/utils";
import {
  HUB_COLLAPSIBLE,
  HUB_CARD_TITLE,
  HUB_BODY,
  HUB_EXPANDED_CONTENT,
  HUB_EXPANDED_CONTENT_STACK,
  HUB_PANEL_ACCENTS,
  HUB_SECTION_GROUP_HEADER,
  HUB_SECTION_GROUP_ICON,
  HUB_SECTION_GROUP_SUBTITLE,
  HUB_SECTION_GROUP_TEXT,
  HUB_SECTION_GROUP_TITLE,
  hubShadedSectionCardClasses,
  type HubPanelAccentKey,
} from "@/lib/parent-hub-premium";
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
  accentKey,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  testId?: string;
  icon?: ReactNode;
  parentHub?: boolean;
  accentKey?: HubPanelAccentKey;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panel = accentKey ? HUB_PANEL_ACCENTS[accentKey] : null;

  const shell = (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-3 text-left transition-all duration-[220ms] ease-[ease]",
          parentHub || panel ? "hover:bg-white/[0.04]" : "hover:bg-muted/30",
        )}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          {panel && !icon ? (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg",
                panel.emojiShell,
              )}
              aria-hidden
            >
              ✨
            </span>
          ) : null}
          <div className="min-w-0">
            <p
              className={cn(
                "font-quicksand font-bold text-foreground",
                parentHub || panel ? "text-lg" : "text-sm",
              )}
            >
              {title}
            </p>
            {!open && subtitle ? (
              <p className={cn(parentHub || panel ? HUB_BODY : "text-xs text-muted-foreground", "truncate mt-0.5")}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-amber-300/80" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div
          className={cn(
            parentHub || panel
              ? cn(HUB_EXPANDED_CONTENT_STACK, "hub-today-stack animate-in fade-in duration-200")
              : "px-3 pb-4 pt-1 space-y-3 border-t border-border animate-in fade-in duration-200",
          )}
        >
          {children}
        </div>
      ) : null}
    </>
  );

  if (panel) {
    return (
      <div
        className={cn(hubShadedSectionCardClasses(panel), "hub-page-enter")}
        data-testid={testId}
      >
        <HubShadedCardBody theme={panel}>
          <div className="min-w-0 flex-1">{shell}</div>
        </HubShadedCardBody>
      </div>
    );
  }

  return (
    <div
      className={cn(
        parentHub ? HUB_COLLAPSIBLE : "rounded-xl border border-border bg-card overflow-hidden",
      )}
      data-testid={testId}
    >
      {shell}
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
  accentKey = "previous-stage",
  headerEmoji = "🕰️",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  testId?: string;
  accentKey?: HubPanelAccentKey;
  headerEmoji?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panel = HUB_PANEL_ACCENTS[accentKey];

  return (
    <div
      className={cn(hubShadedSectionCardClasses(panel), "hub-page-enter")}
      data-testid={testId}
    >
      <HubShadedCardBody theme={panel}>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(HUB_SECTION_GROUP_HEADER, "hover:bg-white/[0.04]")}
            aria-expanded={open}
          >
            <span className={cn(HUB_SECTION_GROUP_ICON, panel.emojiShell)} aria-hidden>
              {headerEmoji}
            </span>
            <div className={HUB_SECTION_GROUP_TEXT}>
              <p className={cn(HUB_SECTION_GROUP_TITLE, "text-foreground")}>{title}</p>
              {!open ? (
                <p className={HUB_SECTION_GROUP_SUBTITLE}>{subtitle}</p>
              ) : null}
            </div>
            <span className="text-xs font-bold text-amber-300/90 shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 h-8 inline-flex items-center">
              {open ? t("parent_hub.explore_ages.hide") : t("parent_hub.explore_ages.show")}
            </span>
          </button>
          {open ? (
            <div
              className={cn(
                HUB_EXPANDED_CONTENT,
                "animate-in fade-in duration-200",
              )}
            >
              <p className={cn(HUB_BODY, "mb-3")}>{subtitle}</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">{children}</div>
            </div>
          ) : null}
        </div>
      </HubShadedCardBody>
    </div>
  );
}
