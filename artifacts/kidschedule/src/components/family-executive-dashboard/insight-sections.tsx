import { useState } from "react";
import { ChevronDown, Trophy, AlertTriangle, Flag, Megaphone, Clock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import type { HubActiveCampaign, HubGoalCoachState, HubTimelineHighlight } from "./types";
import type { HubDashboardSection } from "./types";

interface CollapsibleInsightSectionProps {
  sectionId: HubDashboardSection;
  title: string;
  icon: React.ElementType;
  count: number;
  defaultOpen?: boolean;
  onExpand?: (section: HubDashboardSection) => void;
  children: React.ReactNode;
}

export function CollapsibleInsightSection({
  sectionId,
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  onExpand,
  children,
}: CollapsibleInsightSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onExpand?.(sectionId);
      }}
    >
      <CollapsibleTrigger
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title}
          <span className="text-xs font-normal text-muted-foreground">({count})</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 px-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function WinsList({ wins }: { wins: string[] }) {
  return (
    <ul className="space-y-1.5" role="list">
      {wins.map((win) => (
        <li key={win} className="flex gap-2 text-xs text-foreground leading-relaxed">
          <Trophy className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
          {win}
        </li>
      ))}
    </ul>
  );
}

export function RisksList({ risks }: { risks: string[] }) {
  return (
    <ul className="space-y-1.5" role="list">
      {risks.map((risk) => (
        <li key={risk} className="flex gap-2 text-xs text-foreground leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          {risk}
        </li>
      ))}
    </ul>
  );
}

export function GoalProgressList({
  goals,
  onGoalTap,
}: {
  goals: HubGoalCoachState;
  onGoalTap?: (goalId: string, action: import("./types").HubRoutedAction) => void;
}) {
  const { t } = useTranslation();
  const active = goals.goals.filter((g) => g.active);
  if (active.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-1">
        {t("parent_hub.executive.no_goals", { defaultValue: "No active goals — set one in Amy chat." })}
      </p>
    );
  }
  return (
    <ul className="space-y-2" role="list">
      {active.map((goal) => (
        <li key={goal.id}>
          <button
            type="button"
            className="w-full rounded-lg border border-border/60 p-2 text-left hover:bg-muted/40 transition-colors"
            onClick={() =>
              onGoalTap?.(goal.id, {
                actionTarget: "goal",
                entityId: goal.id,
                href: `/assistant?goalId=${encodeURIComponent(goal.id)}`,
                fallbackTarget: "amy_chat",
              })
            }
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold capitalize flex items-center gap-1">
                <Flag className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                {goal.type}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {goal.progress}/{goal.targetValue} {goal.unit}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={goal.progress}
              aria-valuemin={0}
              aria-valuemax={goal.targetValue}
              aria-label={goal.target}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (goal.progress / Math.max(1, goal.targetValue)) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{goal.coachMessage}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CampaignStrip({
  campaigns,
  onCampaignTap,
}: {
  campaigns: HubActiveCampaign[];
  onCampaignTap?: (campaign: HubActiveCampaign) => void;
}) {
  const { t } = useTranslation();
  if (campaigns.length === 0) return null;
  return (
    <ul className="space-y-2" role="list">
      {campaigns.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            className="w-full rounded-lg border border-border/60 p-2 text-left hover:bg-muted/40 transition-colors"
            onClick={() => onCampaignTap?.(c)}
          >
            <div className="flex items-start gap-2">
              <Megaphone className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{c.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{c.subtitle}</p>
                {c.totalSteps > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("parent_hub.executive.campaign_step", {
                      defaultValue: "Step {{current}} of {{total}}",
                      current: c.currentStep,
                      total: c.totalSteps,
                    })}
                  </p>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function TimelineHighlights({ events }: { events: HubTimelineHighlight[] }) {
  if (events.length === 0) return null;
  return (
    <ul className="space-y-2" role="list">
      {events.map((ev) => (
        <li key={ev.id} className="flex gap-2 text-xs">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">{ev.title}</p>
            {ev.description && (
              <p className="text-muted-foreground line-clamp-2">{ev.description}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function useInsightSectionLabels() {
  const { t } = useTranslation();
  return {
    wins: t("parent_hub.executive.weekly_wins", { defaultValue: "Weekly wins" }),
    risks: t("parent_hub.executive.current_risks", { defaultValue: "Current risks" }),
    goals: t("parent_hub.executive.goal_progress", { defaultValue: "Goal progress" }),
    campaigns: t("parent_hub.executive.active_campaigns", { defaultValue: "Active programs" }),
    timeline: t("parent_hub.executive.timeline", { defaultValue: "Family timeline" }),
  };
}
