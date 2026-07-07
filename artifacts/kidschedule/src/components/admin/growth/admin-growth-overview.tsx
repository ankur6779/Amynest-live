import type { DashboardViewMode, GrowthDashboardData } from "./types";
import { AIInsightPanel } from "./ai-insight-panel";
import { AlertCenter } from "./alert-center";
import { AskAmyPanel } from "./ask-amy";
import { BusinessHealthPanel, GrowthScorePanel } from "./business-health";
import { CountryTable } from "./country-table";
import { CtoModePanel } from "./cto-mode-panel";
import { DataTables } from "./data-tables";
import { ExecutiveSummaryPanel } from "./executive-summary";
import { ExecutiveTimeline } from "./executive-timeline";
import { FeatureCards } from "./feature-cards";
import { FeatureImpactPanel } from "./feature-impact-panel";
import { FunnelChart } from "./funnel-chart";
import { KPICards } from "./kpi-cards";
import { PerformancePanel } from "./performance-panel";
import { PredictionPanel } from "./prediction-panel";
import { RecommendationsPanel } from "./recommendations-panel";
import { RetentionHeatmap } from "./retention-heatmap";
import { RevenueCharts } from "./revenue-charts";
import { RootCausePanel } from "./root-cause-panel";
import { SubscriptionPanel } from "./subscription-panel";

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

function DeviceList({ title, items }: { title: string; items: Array<[string, number]> }) {
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <p className="text-xs font-semibold mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        <ul className="space-y-1 text-[11px]">
          {items.slice(0, 8).map(([name, count]) => (
            <li key={name} className="flex justify-between gap-2">
              <span className="truncate">{name}</span>
              <span className="text-muted-foreground shrink-0">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminGrowthOverview({
  data,
  viewMode,
}: {
  data: GrowthDashboardData;
  viewMode: DashboardViewMode;
}) {
  const exec = data.executive;
  const showFull = viewMode === "full";
  const showCeo = viewMode === "ceo";
  const showCto = viewMode === "cto";

  return (
    <>
      {(showFull || showCeo) && <ExecutiveSummaryPanel summary={exec.summary} />}

      <div className="grid lg:grid-cols-3 gap-4">
        {(showFull || showCeo) && <BusinessHealthPanel health={exec.businessHealth} />}
        {(showFull || showCeo) && <GrowthScorePanel score={exec.growthScore} />}
        {(showFull || showCeo || showCto) && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold font-quicksand mb-3">Alert Center</p>
            <AlertCenter alerts={exec.alerts} />
          </div>
        )}
      </div>

      {(showFull || showCeo) && (
        <AIInsightPanel insights={data.insights} amyInsights={exec.amyInsights} />
      )}

      {(showFull || showCeo) && <AskAmyPanel />}

      {showFull && (
        <div className="grid xl:grid-cols-2 gap-6">
          <Section title="Root Cause Analysis">
            <RootCausePanel causes={exec.rootCauses} />
          </Section>
          <Section title="Recommended Actions">
            <RecommendationsPanel recommendations={exec.recommendations} />
          </Section>
        </div>
      )}

      {showCeo && (
        <Section title="Recommended Actions">
          <RecommendationsPanel recommendations={exec.recommendations} />
        </Section>
      )}

      {showCeo && (
        <Section title="Retention">
          <RetentionHeatmap retention={data.retention} />
        </Section>
      )}

      {showCto && exec.ctoOps && (
        <Section title="CTO Operations">
          <CtoModePanel ops={exec.ctoOps} />
        </Section>
      )}

      {showFull && (
        <>
          <div className="grid xl:grid-cols-2 gap-6">
            <Section title="Executive Timeline">
              <ExecutiveTimeline events={exec.timeline} />
            </Section>
            <Section title="Predictions (Estimated)">
              <PredictionPanel predictions={exec.predictions} />
            </Section>
          </div>

          <Section title="Feature Impact Analysis">
            <FeatureImpactPanel features={exec.featureImpact} />
          </Section>

          <Section title="Key Metrics">
            <KPICards kpis={data.kpis} />
          </Section>

          <div className="grid xl:grid-cols-2 gap-6">
            <Section title="Marketing Funnel">
              <FunnelChart stages={data.funnel} />
            </Section>
            <Section title="Retention">
              <RetentionHeatmap retention={data.retention} />
            </Section>
          </div>

          <Section title="Trends">
            <RevenueCharts charts={data.charts} />
          </Section>

          <Section title="Feature Analytics">
            <FeatureCards features={data.features} />
          </Section>

          <Section title="Subscription Analytics">
            <SubscriptionPanel subscriptions={data.subscriptions} />
          </Section>

          <div className="grid xl:grid-cols-2 gap-6">
            <Section title="Geography">
              <CountryTable geography={data.geography} />
            </Section>
            <Section title="Device Analytics">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {data.devices.platforms.map((p) => (
                  <div key={p.platform} className="rounded-lg border border-white/10 px-3 py-2 text-xs">
                    <span className="font-semibold">{p.platform}</span>
                    <span className="text-muted-foreground ml-2">
                      {p.users} users · {p.sessions} sessions
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <DeviceList title="Browsers" items={data.devices.browsers.map((b) => [b.browser, b.users])} />
                <DeviceList title="App Versions" items={data.devices.appVersions.map((v) => [v.version, v.users])} />
                <DeviceList title="Screen Sizes" items={data.devices.screenSizes.map((s) => [s.size, s.users])} />
                <DeviceList title="OS" items={data.devices.osVersions.map((o) => [o.os, o.users])} />
              </div>
            </Section>
          </div>

          <Section title="Performance">
            <PerformancePanel performance={data.performance} />
          </Section>

          <Section title="Data Tables">
            <DataTables tables={data.tables} campaigns={data.campaigns} devices={data.devices} />
          </Section>
        </>
      )}
    </>
  );
}
