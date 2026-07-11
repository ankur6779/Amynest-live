import { useState } from "react";
import { cn } from "@/lib/utils";
import type { GrowthTimePreset } from "./types";
import type {
  GosNavSection,
  IntelligenceTab,
} from "./gos-types";
import { INTELLIGENCE_TABS as TABS } from "./gos-types";
import { useGosSection } from "./use-gos-section";
import { AIInsightPanel } from "./ai-insight-panel";
import { RootCausePanel } from "./root-cause-panel";
import { ExecutiveSummaryPanel } from "./executive-summary";
import { BusinessHealthPanel, GrowthScorePanel } from "./business-health";
import { AlertCenter } from "./alert-center";
import { AskAmyPanel } from "./ask-amy";
import { CtoModePanel } from "./cto-mode-panel";
import { RecommendationsPanel } from "./recommendations-panel";
import { ExecutiveTimeline } from "./executive-timeline";
import { FeatureImpactPanel } from "./feature-impact-panel";
import { KPICards } from "./kpi-cards";
import { FunnelChart } from "./funnel-chart";
import { RetentionHeatmap } from "./retention-heatmap";
import { RevenueCharts } from "./revenue-charts";
import { FeatureCards } from "./feature-cards";
import { SubscriptionPanel } from "./subscription-panel";
import { DecisionCenterPanel } from "./decision-center-panel";
import { ExperimentCenterPanel } from "./experiment-center-panel";
import { CampaignHubPanel } from "./campaign-hub-panel";
import { AttributionPanel } from "./attribution-panel";
import { JourneyExplorerPanel } from "./journey-explorer-panel";
import { CohortExplorerPanel } from "./cohort-explorer-panel";
import { GrowthCalendarPanel } from "./growth-calendar-panel";
import { FeatureImpactLabPanel } from "./feature-impact-lab-panel";
import { AlertsWorkflowPanel } from "./alerts-workflow-panel";
import { PredictionV2Panel } from "./prediction-v2-panel";
import { SettingsPanel } from "./settings-panel";
import { PreSignupFunnelPanel } from "./pre-signup-funnel-panel";
import { RevenueIntelligenceSection } from "./revenue-intelligence-section";
import { ObservatoryPanel } from "./observatory-panel";
import type {
  DecisionsSectionData,
  ExecutiveSectionData,
  IntelligenceSectionData,
  PredictionsSectionData,
  ObservatorySectionData,
} from "./gos-types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 overflow-hidden print:break-inside-avoid">
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <h2 className="font-semibold font-quicksand text-sm">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function LoadingBlock() {
  return <p className="text-xs text-muted-foreground py-8 text-center">Loading section…</p>;
}

function IntelligenceSection({
  preset,
  customStart,
  customEnd,
}: {
  preset: GrowthTimePreset;
  customStart: string;
  customEnd: string;
}) {
  const [tab, setTab] = useState<IntelligenceTab>("insights");
  const apiSection = TABS.find((t) => t.id === tab)?.apiSection ?? "intelligence";

  const { data, isLoading } = useGosSection(apiSection, preset, customStart, customEnd);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] border",
              tab === t.id ? "border-primary/40 bg-primary/10" : "border-white/10 text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingBlock />}

      {!isLoading && tab === "insights" && data && (
        <div className="space-y-4">
          <AIInsightPanel
            insights={(data.data as IntelligenceSectionData).insights}
            amyInsights={(data.data as IntelligenceSectionData).amyInsights}
          />
          <Section title="Root Cause Analysis">
            <RootCausePanel causes={(data.data as IntelligenceSectionData).rootCauses} />
          </Section>
          <AskAmyPanel />
        </div>
      )}

      {!isLoading && tab === "journey" && (
        <JourneyExplorerPanel preset={preset} customStart={customStart} customEnd={customEnd} />
      )}
      {!isLoading && tab === "cohorts" && (
        <CohortExplorerPanel preset={preset} customStart={customStart} customEnd={customEnd} />
      )}
      {!isLoading && tab === "calendar" && data && (
        <GrowthCalendarPanel events={(data.data as { events: import("./gos-types").GrowthCalendarEvent[] }).events} />
      )}
      {!isLoading && tab === "attribution" && data && (
        <AttributionPanel
          stages={(data.data as { stages: import("./gos-types").AttributionStage[] }).stages}
          note={(data.data as { note: string | null }).note}
        />
      )}
      {!isLoading && tab === "feature-impact" && data && (
        <FeatureImpactLabPanel features={(data.data as { features: import("./gos-types").FeatureImpactLabRow[] }).features} />
      )}
    </div>
  );
}

export function GosSectionContent({
  section,
  preset,
  customStart,
  customEnd,
}: {
  section: GosNavSection;
  preset: GrowthTimePreset;
  customStart: string;
  customEnd: string;
}) {
  const apiSection = section === "recommendations" ? "decisions" : section;
  const { data, isLoading, error } = useGosSection(apiSection, preset, customStart, customEnd, undefined, section !== "overview");

  if (section === "overview") return null;

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm">
        Failed to load section data.
      </div>
    );
  }

  if (isLoading || !data) return <LoadingBlock />;

  const d = data.data;

  switch (section) {
    case "executive": {
      const execData = d as ExecutiveSectionData;
      const exec = execData.dashboard?.executive;
      if (!exec) {
        return (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            Executive data is unavailable for this period.
          </div>
        );
      }
      return (
        <div className="space-y-6">
          <ExecutiveSummaryPanel summary={exec.summary} />
          <div className="grid lg:grid-cols-3 gap-4">
            <BusinessHealthPanel health={exec.businessHealth} />
            <GrowthScorePanel score={exec.growthScore} />
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs font-semibold font-quicksand mb-3">Alert Center</p>
              <AlertCenter alerts={exec.alerts} />
            </div>
          </div>
          <AIInsightPanel insights={execData.dashboard.insights} amyInsights={exec.amyInsights} />
          <AskAmyPanel />
          <div className="grid xl:grid-cols-2 gap-6">
            <Section title="Root Cause Analysis">
              <RootCausePanel causes={exec.rootCauses} />
            </Section>
            <Section title="Recommended Actions">
              <RecommendationsPanel recommendations={exec.recommendations} />
            </Section>
          </div>
          <div className="grid xl:grid-cols-2 gap-6">
            <Section title="Executive Timeline">
              <ExecutiveTimeline events={exec.timeline} />
            </Section>
            <Section title="Feature Impact">
              <FeatureImpactPanel features={exec.featureImpact} />
            </Section>
          </div>
          {exec.ctoOps && (
            <Section title="CTO Operations">
              <CtoModePanel ops={exec.ctoOps} />
            </Section>
          )}
        </div>
      );
    }
    case "acquisition":
      return (
        <div className="space-y-6">
          <Section title="Acquisition KPIs">
            <KPICards kpis={(d as { kpis: Record<string, import("./types").TrendValue> }).kpis} />
          </Section>
          <Section title="Acquisition Funnel">
            <FunnelChart stages={(d as { funnel: import("./types").FunnelStage[] }).funnel} />
          </Section>
        </div>
      );
    case "activation":
      return (
        <div className="space-y-6">
          <Section title="Activation Funnel">
            <FunnelChart stages={(d as { funnel: import("./types").FunnelStage[] }).funnel} />
          </Section>
          <Section title="Feature Analytics">
            <FeatureCards features={(d as { features: import("./types").FeatureMetric[] }).features} />
          </Section>
        </div>
      );
    case "retention":
      return (
        <div className="space-y-6">
          <Section title="Retention Heatmap">
            <RetentionHeatmap retention={(d as { retention: import("./types").GrowthDashboardData["retention"] }).retention} />
          </Section>
          <Section title="Cohort Explorer">
            <CohortExplorerPanel preset={preset} customStart={customStart} customEnd={customEnd} />
          </Section>
        </div>
      );
    case "revenue": {
      const rev = d as {
        subscriptions: import("./types").GrowthDashboardData["subscriptions"];
        charts: import("./types").GrowthDashboardData["charts"];
        attribution: { stages: import("./gos-types").AttributionStage[]; note: string | null };
        revenueIntelligence?: import("./gos-types").RevenueIntelligencePayload;
      };
      return (
        <div className="space-y-6">
          <Section title="Subscription Analytics">
            <SubscriptionPanel subscriptions={rev.subscriptions} />
          </Section>
          <Section title="Revenue Trends">
            <RevenueCharts charts={rev.charts} />
          </Section>
          <Section title="Revenue Attribution">
            <AttributionPanel stages={rev.attribution.stages} note={rev.attribution.note} />
          </Section>
          {rev.revenueIntelligence && (
            <Section title="Revenue Intelligence">
              <RevenueIntelligenceSection data={rev.revenueIntelligence} />
            </Section>
          )}
        </div>
      );
    }
    case "campaigns": {
      const hub = d as {
        rows: import("./gos-types").CampaignHubRow[];
        awaitingIntegration: boolean;
        integrationTargets: string[];
        message: string | null;
      };
      return (
        <Section title="Campaign Hub">
          <CampaignHubPanel
            rows={hub.rows}
            awaitingIntegration={hub.awaitingIntegration}
            integrationTargets={hub.integrationTargets}
            message={hub.message}
          />
        </Section>
      );
    }
    case "experiments": {
      const exp = d as {
        experiments: import("./gos-types").GrowthOsExperiment[];
        actionHistory: DecisionsSectionData["actionHistory"];
      };
      return (
        <Section title="Experiment Center">
          <ExperimentCenterPanel experiments={exp.experiments} actionHistory={exp.actionHistory} />
        </Section>
      );
    }
    case "intelligence":
      return <IntelligenceSection preset={preset} customStart={customStart} customEnd={customEnd} />;
    case "recommendations": {
      const dec = d as DecisionsSectionData;
      return (
        <Section title="Decision Center">
          <DecisionCenterPanel decisions={dec.decisions} actionHistory={dec.actionHistory} />
        </Section>
      );
    }
    case "alerts": {
      const alerts = d as {
        workflows: import("./gos-types").GrowthOsAlertWorkflow[];
        actionHistory: DecisionsSectionData["actionHistory"];
      };
      return (
        <Section title="Alert Workflow">
          <AlertsWorkflowPanel workflows={alerts.workflows} actionHistory={alerts.actionHistory} />
        </Section>
      );
    }
    case "predictions": {
      const pred = d as PredictionsSectionData;
      return (
        <Section title="Predictions">
          <PredictionV2Panel v1={pred.v1} v2={pred.v2} />
        </Section>
      );
    }
    case "settings":
      return (
        <Section title="Growth OS Settings">
          <SettingsPanel settings={(d as { settings: import("./gos-types").GrowthOsSettings }).settings} />
        </Section>
      );
    case "observatory": {
      const obs = d as ObservatorySectionData;
      return (
        <Section title="Growth Observatory">
          <ObservatoryPanel observatory={obs.observatory} brief={obs.brief} operations={obs.operations} />
        </Section>
      );
    }
    case "pre-signup":
      return (
        <Section title="Pre-Signup Notification Funnel">
          <PreSignupFunnelPanel preset={preset} customStart={customStart} customEnd={customEnd} />
        </Section>
      );
    default:
      return null;
  }
}
