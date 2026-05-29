import { useEffect, useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronRight,
  LayoutDashboard,
  Trophy,
  AlertTriangle,
  Flag,
  Megaphone,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useHubDashboard } from "@/hooks/use-hub-dashboard";
import { useActionNavigation } from "@/hooks/use-action-navigation";
import { useIntentMutations } from "@/hooks/use-intent-recovery";
import { setActiveIntentId } from "@/hooks/use-intent-interruption-tracker";
import { trackHubExecutiveEvent } from "@/lib/hub-executive-analytics";
import { getApiUrl } from "@/lib/api";
import { FamilyHealthRing } from "./family-health-ring";
import { PrimaryActionCard } from "./primary-action-card";
import { MetricPills } from "./metric-pills";
import { AmyRecommendationCard } from "./amy-recommendation-card";
import {
  CollapsibleInsightSection,
  WinsList,
  RisksList,
  GoalProgressList,
  CampaignStrip,
  TimelineHighlights,
  useInsightSectionLabels,
} from "./insight-sections";
import { HubDashboardSkeleton, HubDashboardPanelSkeleton } from "./dashboard-states";
import { HubDashboardError, HubDashboardEmpty } from "./dashboard-empty-error";
import type { HubDashboardData, HubDashboardSection, HubPrimaryAction, HubRoutedAction } from "./types";

interface FamilyExecutiveDashboardProps {
  childId: number;
  childName: string;
}

function HubDashboardPanel({
  data,
  onPrimaryAction,
  onNavigateAction,
  onAskAmy,
  onSectionExpand,
}: {
  data: HubDashboardData;
  onPrimaryAction: (action: HubPrimaryAction) => void;
  onNavigateAction: (action: HubRoutedAction, label: string) => void;
  onAskAmy: (question: string) => void;
  onSectionExpand: (section: HubDashboardSection) => void;
}) {
  const { t } = useTranslation();
  const labels = useInsightSectionLabels();
  const activeGoalCount = data.goals.goals.filter((g) => g.active).length;

  return (
    <div className="space-y-4 max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain pr-1">
      <p className="text-sm text-muted-foreground leading-relaxed">{data.narration}</p>

      {data.primaryAction && (
        <PrimaryActionCard action={data.primaryAction} onAction={onPrimaryAction} />
      )}

      <MetricPills
        learning={data.learningMetric}
        routine={data.routineMetric}
        onMetricTap={onNavigateAction}
      />

      <AmyRecommendationCard
        recommendation={data.amyRecommendation}
        onAskAmy={onAskAmy}
        onNavigate={() => onNavigateAction(data.amyRecommendation.action, "amy_recommendation")}
      />

      <CollapsibleInsightSection
        sectionId="wins"
        title={labels.wins}
        icon={Trophy}
        count={data.weeklyWins.length}
        onExpand={onSectionExpand}
      >
        <WinsList wins={data.weeklyWins} />
      </CollapsibleInsightSection>

      <CollapsibleInsightSection
        sectionId="risks"
        title={labels.risks}
        icon={AlertTriangle}
        count={data.currentRisks.length}
        onExpand={onSectionExpand}
      >
        <RisksList risks={data.currentRisks} />
      </CollapsibleInsightSection>

      {activeGoalCount > 0 && (
        <CollapsibleInsightSection
          sectionId="goals"
          title={labels.goals}
          icon={Flag}
          count={activeGoalCount}
          onExpand={onSectionExpand}
        >
          <GoalProgressList goals={data.goals} onGoalTap={(goalId, action) => onNavigateAction(action, "goal")} />
        </CollapsibleInsightSection>
      )}

      {data.activeCampaigns.length > 0 && (
        <CollapsibleInsightSection
          sectionId="campaigns"
          title={labels.campaigns}
          icon={Megaphone}
          count={data.activeCampaigns.length}
          onExpand={onSectionExpand}
        >
          <CampaignStrip campaigns={data.activeCampaigns} onCampaignTap={(c) => onNavigateAction(c.action, "campaign")} />
        </CollapsibleInsightSection>
      )}

      {data.timelineHighlights.length > 0 && (
        <CollapsibleInsightSection
          sectionId="timeline"
          title={labels.timeline}
          icon={Clock}
          count={data.timelineHighlights.length}
          onExpand={onSectionExpand}
        >
          <TimelineHighlights events={data.timelineHighlights} />
        </CollapsibleInsightSection>
      )}

      <div className="pt-2 border-t border-border">
        <Link href="/assistant">
          <Button type="button" variant="outline" size="sm" className="w-full">
            {t("parent_hub.executive.open_amy", { defaultValue: "Open Amy command center" })}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function FamilyExecutiveDashboard({ childId, childName }: FamilyExecutiveDashboardProps) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const [, navigate] = useLocation();
  const { navigateAction } = useActionNavigation();
  const { createIntent, transition } = useIntentMutations();
  const { data, isLoading, isError, refetch, isFetching } = useHubDashboard(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (data && !isLoading) {
      trackHubExecutiveEvent("hub_executive_view", {
        childId,
        healthScore: data.healthScore,
        hasPrimaryAction: data.primaryAction != null,
      });
    }
  }, [data, isLoading, childId]);

  useEffect(() => {
    if (isError) {
      trackHubExecutiveEvent("hub_executive_error", { childId });
    }
  }, [isError, childId]);

  const recordFeedback = useCallback(
    async (action: HubPrimaryAction, response: "accepted" | "dismissed") => {
      try {
        await authFetch(getApiUrl("/api/amy/decision-feedback"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recommendationId: action.id,
            recommendationTitle: action.title,
            userResponse: response,
          }),
        });
      } catch {
        /* best-effort */
      }
    },
    [authFetch],
  );

  const handlePrimaryAction = useCallback(
    (action: HubPrimaryAction) => {
      trackHubExecutiveEvent("hub_executive_primary_action_tap", {
        actionId: action.id,
        surface: action.surface,
      });
      void recordFeedback(action, "accepted");
      void authFetch(getApiUrl("/api/reality-validation/action-by-key"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationKey: `hub_${action.id}`,
        }),
      }).catch(() => {});
      void createIntent.mutateAsync({
        intentType: "AMY_RECOMMENDED_ACTION",
        intentSource: "parent_hub",
        title: action.title,
        subtitle: action.description,
        actionTarget: action.action.actionTarget,
        entityId: action.action.entityId,
        href: action.href,
        progressPct: 0,
      }).then((created: { intentId?: string }) => {
        if (created?.intentId) setActiveIntentId(created.intentId);
      });
      navigateAction(action.action, { source: "hub_card" });
      setOpen(false);
    },
    [navigateAction, recordFeedback, createIntent, authFetch],
  );

  const handleNavigateAction = useCallback(
    (action: HubRoutedAction, _label: string) => {
      navigateAction(action, { source: "hub_card" });
      setOpen(false);
    },
    [navigateAction],
  );

  const handleAskAmy = useCallback(
    (question: string) => {
      trackHubExecutiveEvent("hub_executive_ask_amy", { questionLen: question.length });
      const q = encodeURIComponent(question);
      navigate(`/assistant?q=${q}`);
      setOpen(false);
    },
    [navigate],
  );

  const handleSectionExpand = useCallback((section: HubDashboardSection) => {
    trackHubExecutiveEvent("hub_executive_section_expand", { section });
  }, []);

  const handleOpen = () => {
    trackHubExecutiveEvent("hub_executive_tile_open", { childId });
    setOpen(true);
  };

  const handleRetry = () => {
    trackHubExecutiveEvent("hub_executive_retry", { childId });
    void refetch();
  };

  const isEmpty =
    data &&
    data.healthScore === 0 &&
    !data.primaryAction &&
    data.weeklyWins.length === 0;

  return (
    <>
      {isLoading ? (
        <HubDashboardSkeleton />
      ) : isError ? (
        <HubDashboardError onRetry={handleRetry} />
      ) : isEmpty ? (
        <HubDashboardEmpty />
      ) : data ? (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full text-left rounded-2xl border border-border/60 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("parent_hub.executive.open_dashboard", {
            defaultValue: "Open family executive dashboard",
          })}
          data-testid="hub-executive-tile"
        >
          <div className="relative p-4 bg-gradient-to-br from-violet-600/90 via-indigo-700/85 to-slate-900/90">
            <div className="flex items-center gap-4 mb-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigateAction(data.familyHealthAction, "family_health");
                }}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label={t("parent_hub.executive.health_details", { defaultValue: "View family health details" })}
              >
                <FamilyHealthRing
                  score={data.healthScore}
                  trendLabel={data.healthTrendLabel}
                  trend7d={data.healthTrend7d}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <LayoutDashboard className="h-3.5 w-3.5 text-white/80" aria-hidden="true" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/80">
                    {t("parent_hub.executive.control_center", { defaultValue: "Family control center" })}
                  </span>
                </div>
                <p className="text-sm font-bold text-white leading-snug line-clamp-2">
                  {data.primaryAction?.title ??
                    t("parent_hub.executive.all_clear", { defaultValue: "Your family rhythm looks steady" })}
                </p>
                {data.primaryAction?.why && (
                  <p className="text-[11px] text-white/70 mt-1 line-clamp-1">
                    {t("parent_hub.executive.why", { defaultValue: "Why:" })} {data.primaryAction.why}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-white/60 shrink-0" aria-hidden="true" />
            </div>
            <div className="[&_span]:text-white [&_span:last-child]:text-white/90 [&_svg]:text-white/70">
              <MetricPills
                learning={data.learningMetric}
                routine={data.routineMetric}
                onMetricTap={handleNavigateAction}
                variant="dark"
              />
            </div>
          </div>
        </button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-lg p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FamilyHealthRing
                score={data?.healthScore ?? 0}
                trendLabel={data?.healthTrendLabel ?? "stable"}
                trend7d={data?.healthTrend7d ?? 0}
                size={56}
              />
              <span>
                {t("parent_hub.executive.dashboard_title", {
                  defaultValue: "{{name}}'s family dashboard",
                  name: childName,
                })}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("parent_hub.executive.dashboard_a11y", {
                defaultValue: "Executive summary with health score, priority action, and insights",
              })}
            </DialogDescription>
          </DialogHeader>

          {isFetching && !data ? (
            <HubDashboardPanelSkeleton />
          ) : data ? (
            <HubDashboardPanel
              data={data}
              onPrimaryAction={handlePrimaryAction}
              onNavigateAction={handleNavigateAction}
              onAskAmy={handleAskAmy}
              onSectionExpand={handleSectionExpand}
            />
          ) : (
            <HubDashboardError onRetry={handleRetry} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
