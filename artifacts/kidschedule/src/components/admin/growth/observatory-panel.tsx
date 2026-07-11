import { AlertTriangle, ArrowDown, ArrowUp, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { OperationsSection } from "./operations-section";
import type {
  DailyExecutiveBrief,
  GrowthObservatoryPayload,
  GrowthOperationsPayload,
  ObservatoryAlert,
  ObservatoryTrend,
  OpportunityItem,
} from "./gos-types";

function TrendBadge({ value }: { value: number | null }) {
  if (value == null || Math.abs(value) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[10px]">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const up = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold", up ? "text-emerald-400" : "text-rose-400")}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

function formatTrend(key: string, t: ObservatoryTrend): string {
  if (!t.verified && t.note) return "NOT VERIFIED";
  if (t.value == null) return "—";
  if (key.includes("Pct") || key.includes("Rate") || key === "d1" || key === "d3" || key === "d7" || key === "d14" || key === "d30") {
    return `${t.value}%`;
  }
  if (key === "mrr" || key === "arr" || key.includes("revenue") || key === "arpu") {
    return `₹${t.value.toLocaleString()}`;
  }
  return t.value.toLocaleString();
}

function MetricGrid({
  title,
  metrics,
}: {
  title: string;
  metrics: Array<{ key: string; label: string; trend: ObservatoryTrend }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/10">
        <h3 className="text-xs font-semibold font-quicksand">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3">
        {metrics.map((m) => (
          <div key={m.key} className="rounded-lg border border-white/10 px-2.5 py-2 min-w-0">
            <p className="text-[9px] uppercase tracking-widest text-primary/60 truncate">{m.label}</p>
            <p className="text-base font-bold font-quicksand mt-0.5 truncate">{formatTrend(m.key, m.trend)}</p>
            {m.trend.verified && m.trend.changePct != null && <TrendBadge value={m.trend.changePct} />}
            {m.trend.note && <p className="text-[9px] text-amber-400/90 mt-1 line-clamp-2">{m.trend.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyBriefCard({ brief }: { brief: DailyExecutiveBrief }) {
  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h2 className="font-quicksand font-bold">Daily Executive Brief — {brief.date}</h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{brief.executiveSummary}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 text-[11px]">
        <ScorePill label="Overall" value={brief.overallHealthScore} />
        <ScorePill label="Growth" value={brief.scores.growth} />
        <ScorePill label="Retention" value={brief.scores.retention} />
        <ScorePill label="Revenue" value={brief.scores.revenue} />
        <ScorePill label="Reliability" value={brief.scores.reliability} />
      </div>
      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <BriefRow label="Biggest improvement" value={brief.biggestImprovement} positive />
        <BriefRow label="Biggest regression" value={brief.biggestRegression} />
        <BriefRow label="Highest priority" value={brief.highestPriorityToday} />
        <BriefRow label="Top action" value={brief.topRecommendedAction} />
      </div>
      {brief.blockedItems.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-400 mb-1">Blocked / NOT VERIFIED</p>
          <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
            {brief.blockedItems.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-emerald-400/90">Expected impact: {brief.expectedBusinessImpact}</p>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 px-2 py-1.5 text-center">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="font-bold font-quicksand">{value}</p>
    </div>
  );
}

function BriefRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("font-medium", positive && "text-emerald-400")}>{value}</p>
    </div>
  );
}

function FunnelIntelTable({ stages, largestRegression }: GrowthObservatoryPayload["funnel"]) {
  return (
    <div className="space-y-1">
      {stages.map((s, idx) => (
        <div key={s.key}>
          {idx > 0 && <p className="text-center text-[10px] text-muted-foreground py-0.5">↓</p>}
          <div
            className={cn(
              "rounded-lg border px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]",
              largestRegression?.key === s.key ? "border-rose-500/40 bg-rose-500/5" : "border-white/10",
            )}
          >
            <span className="font-semibold min-w-[120px]">{s.label}</span>
            <span>{s.users.toLocaleString()} users</span>
            {s.dropPct != null && s.dropPct > 0 && <span className="text-rose-400">-{s.dropPct}% drop</span>}
            <span className="text-muted-foreground">1d <TrendBadge value={s.trendVsYesterday} /></span>
            <span className="text-muted-foreground">7d <TrendBadge value={s.trendVs7d} /></span>
            <span className="text-muted-foreground">30d <TrendBadge value={s.trendVs30d} /></span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsList({ alerts }: { alerts: ObservatoryAlert[] }) {
  if (alerts.length === 0) {
    return <p className="text-xs text-muted-foreground">No statistically meaningful alerts in this window.</p>;
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            a.category === "critical" && "border-rose-500/30 bg-rose-500/5",
            a.category === "warning" && "border-amber-500/30 bg-amber-500/5",
            a.category === "info" && "border-white/10",
          )}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{a.title}</p>
              <p className="text-muted-foreground mt-0.5">{a.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Evidence: {a.evidence}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OpportunityList({ items, title }: { items: OpportunityItem[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mb-2">{title}</p>
      <ol className="space-y-2 text-xs">
        {items.map((o) => (
          <li key={o.rank} className="rounded-lg border border-white/10 px-3 py-2">
            <p className="font-semibold">
              #{o.rank} {o.title}
              {!o.verified && <span className="text-amber-400 ml-1">(NOT VERIFIED)</span>}
            </p>
            <p className="text-muted-foreground mt-0.5">{o.evidence}</p>
            <p className="text-[10px] mt-1">
              {o.affectedUsers.toLocaleString()} users · {o.estimatedImpact} · Effort {o.engineeringEffort} ·{" "}
              {o.confidence} confidence
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

const ACQUISITION_LABELS: Record<string, string> = {
  installs: "Installs",
  firstOpens: "First Opens",
  signupRate: "Signup Rate",
  costPerInstall: "Cost Per Install",
  costPerSignup: "Cost Per Signup",
  organicVsPaid: "Organic vs Paid",
};

const ACTIVATION_LABELS: Record<string, string> = {
  dashboardReachPct: "Dashboard Reach %",
  routineCtaPct: "Routine CTA %",
  routineStartedPct: "Routine Started %",
  routineCompletedPct: "Routine Completed %",
  firstValueAchievedPct: "First Value %",
};

const RETENTION_LABELS: Record<string, string> = {
  dau: "DAU",
  wau: "WAU",
  mau: "MAU",
  d1: "D1",
  d3: "D3",
  d7: "D7",
  d14: "D14",
  d30: "D30",
  avgSessionLengthSec: "Avg Session (sec)",
  sessionsPerUser: "Sessions / User",
};

const REVENUE_LABELS: Record<string, string> = {
  trialStarted: "Trial Started",
  trialActive: "Trial Active",
  trialExpired: "Trial Expired",
  trialToPaidPct: "Trial → Paid %",
  mrr: "MRR",
  arr: "ARR",
  revenuePerInstall: "Revenue / Install",
  revenuePerTrial: "Revenue / Trial",
  arpu: "ARPU",
  purchaseSuccessPct: "Purchase Success %",
  purchaseFailurePct: "Purchase Failure %",
};

const HEALTH_LABELS: Record<string, string> = {
  crashFreePct: "Crash Free %",
  startupSuccessPct: "Startup Success %",
  startupFailurePct: "Startup Failure %",
  blankScreenPct: "Blank Screen %",
  authFailurePct: "Auth Failure %",
  apiFailureCount: "API Failures",
  avgApiLatencyMs: "Avg API Latency (ms)",
};

function toMetricRows(
  record: Record<string, ObservatoryTrend>,
  labels: Record<string, string>,
): Array<{ key: string; label: string; trend: ObservatoryTrend }> {
  return Object.entries(labels).map(([key, label]) => ({
    key,
    label,
    trend: record[key] ?? { value: null, previous: null, changePct: null, trend1d: null, trend7d: null, trend30d: null, verified: false, note: null },
  }));
}

export function ObservatoryPanel({
  observatory,
  brief,
  operations,
}: {
  observatory: GrowthObservatoryPayload;
  brief: DailyExecutiveBrief;
  operations?: GrowthOperationsPayload;
}) {
  const { activation } = observatory;

  return (
    <div className="space-y-6">
      <DailyBriefCard brief={brief} />

      <div className="grid lg:grid-cols-2 gap-4">
        <MetricGrid title="Acquisition" metrics={toMetricRows(observatory.acquisition, ACQUISITION_LABELS)} />
        <MetricGrid title="Activation" metrics={toMetricRows(observatory.activation.metrics, ACTIVATION_LABELS)} />
      </div>

      {(activation.timeToFirstValueMedianMin != null || activation.timeToFirstValueP95Min != null) && (
        <div className="rounded-xl border border-white/10 px-4 py-3 flex gap-6 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground">Median time to first value</p>
            <p className="font-bold font-quicksand">{activation.timeToFirstValueMedianMin ?? "—"} min</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">P95 time to first value</p>
            <p className="font-bold font-quicksand">{activation.timeToFirstValueP95Min ?? "—"} min</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <MetricGrid title="Retention" metrics={toMetricRows(observatory.retention, RETENTION_LABELS)} />
        <MetricGrid title="Revenue" metrics={toMetricRows(observatory.revenue, REVENUE_LABELS)} />
      </div>

      <MetricGrid title="Product Health" metrics={toMetricRows(observatory.productHealth, HEALTH_LABELS)} />

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/10">
          <h3 className="text-xs font-semibold font-quicksand">Funnel Intelligence</h3>
        </div>
        <div className="p-4">
          <FunnelIntelTable {...observatory.funnel} />
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-xs font-semibold font-quicksand mb-3">Growth Alerts</h3>
          <AlertsList alerts={observatory.alerts} />
        </div>
        <div className="rounded-xl border border-white/10 p-4 space-y-4">
          <h3 className="text-xs font-semibold font-quicksand">Opportunity Engine</h3>
          <OpportunityList items={observatory.opportunities.growth} title="Growth" />
          <OpportunityList items={observatory.opportunities.revenue} title="Revenue" />
          <OpportunityList items={observatory.opportunities.retention} title="Retention" />
          <OpportunityList items={observatory.opportunities.technical} title="Technical Risks" />
        </div>
      </div>

      {observatory.experiments.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/10">
            <h3 className="text-xs font-semibold font-quicksand">Experiment Intelligence</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-white/10">
                  <th className="px-3 py-2">Experiment</th>
                  <th className="px-3 py-2">Control</th>
                  <th className="px-3 py-2">Variant</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Winner</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {observatory.experiments.map((e) => (
                  <tr key={e.id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-medium">{e.name}</td>
                    <td className="px-3 py-2">{e.controlUsers}</td>
                    <td className="px-3 py-2">{e.variantUsers}</td>
                    <td className="px-3 py-2">
                      {e.insufficientSample ? (
                        <span className="text-amber-400">Low sample</span>
                      ) : (
                        `${e.confidencePct ?? "—"}%`
                      )}
                    </td>
                    <td className="px-3 py-2">{e.winningVariant ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {observatory.cohorts.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/10">
            <h3 className="text-xs font-semibold font-quicksand">Cohort Intelligence</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-white/10">
                  <th className="px-3 py-2">Segment</th>
                  <th className="px-3 py-2">Users</th>
                  <th className="px-3 py-2">D1</th>
                  <th className="px-3 py-2">D7</th>
                  <th className="px-3 py-2">Routine %</th>
                  <th className="px-3 py-2">Trial %</th>
                  <th className="px-3 py-2">Paid %</th>
                </tr>
              </thead>
              <tbody>
                {observatory.cohorts.map((c) => (
                  <tr key={`${c.dimension}-${c.segment}`} className="border-b border-white/5">
                    <td className="px-3 py-2">
                      {c.segment}
                      {!c.verified && <span className="text-amber-400 text-[10px] ml-1">NOT VERIFIED</span>}
                    </td>
                    <td className="px-3 py-2">{c.users}</td>
                    <td className="px-3 py-2">{c.d1 ?? "—"}</td>
                    <td className="px-3 py-2">{c.d7 ?? "—"}</td>
                    <td className="px-3 py-2">{c.routineRate ?? "—"}</td>
                    <td className="px-3 py-2">{c.trialRate ?? "—"}</td>
                    <td className="px-3 py-2">{c.paidRate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {observatory.predictions.length > 0 && (
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-xs font-semibold font-quicksand mb-3">Predictive Intelligence (30-day)</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {observatory.predictions.map((p) => (
              <div key={p.metric} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="font-semibold">{p.metric}</p>
                {p.status === "not_enough_data" ? (
                  <p className="text-amber-400 mt-1">NOT ENOUGH DATA</p>
                ) : (
                  <p className="mt-1">
                    {p.pointEstimate?.toLocaleString() ?? "—"}{" "}
                    <span className="text-muted-foreground">
                      [{p.low ?? "—"} – {p.high ?? "—"}] · {p.confidencePct}% CI
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 text-xs">
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-xs font-semibold font-quicksand mb-2">Top Countries</h3>
          <ul className="space-y-1">
            {observatory.breakdown.countries.map((c) => (
              <li key={c.country} className="flex justify-between">
                <span>{c.country}</span>
                <span className="text-muted-foreground">{c.users} users</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-xs font-semibold font-quicksand mb-2">Platforms</h3>
          <ul className="space-y-1">
            {observatory.breakdown.platforms.map((p) => (
              <li key={p.platform} className="flex justify-between">
                <span>{p.platform}</span>
                <span className="text-muted-foreground">{p.users} users</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {operations && <OperationsSection operations={operations} />}
    </div>
  );
}
