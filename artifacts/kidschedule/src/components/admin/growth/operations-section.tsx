import { ListChecks, GitBranch, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EvidenceChain,
  FounderAction,
  GrowthOperationsPayload,
  MetricChange,
  WeeklyExecutiveReview,
} from "./gos-types";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "verified"
      ? "text-emerald-400"
      : status === "not_enough_evidence"
        ? "text-amber-400"
        : "text-muted-foreground";
  return <span className={cn("text-[10px] font-semibold uppercase", cls)}>{status.replace(/_/g, " ")}</span>;
}

function ActionQueueTable({ actions }: { actions: FounderAction[] }) {
  if (actions.length === 0) {
    return <p className="text-xs text-muted-foreground">No high-confidence actions recommended today.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-white/10">
            <th className="px-2 py-2">P</th>
            <th className="px-2 py-2">Problem</th>
            <th className="px-2 py-2">Evidence</th>
            <th className="px-2 py-2">Impact</th>
            <th className="px-2 py-2">Conf</th>
            <th className="px-2 py-2">Effort</th>
            <th className="px-2 py-2">Owner</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.id} className="border-b border-white/5 align-top">
              <td className="px-2 py-2 font-bold">{a.priority}</td>
              <td className="px-2 py-2 max-w-[200px]">
                <p className="font-medium">{a.problem}</p>
                {a.status !== "verified" && (
                  <p className="text-amber-400 text-[10px] mt-0.5">NOT ENOUGH EVIDENCE</p>
                )}
              </td>
              <td className="px-2 py-2 text-muted-foreground max-w-[220px]">{a.evidence}</td>
              <td className="px-2 py-2">{a.businessImpact}</td>
              <td className="px-2 py-2">{a.confidence}%</td>
              <td className="px-2 py-2">{a.estimatedHours}</td>
              <td className="px-2 py-2 capitalize">{a.recommendedOwner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangesList({ changes }: { changes: MetricChange[] }) {
  if (changes.length === 0) {
    return <p className="text-xs text-muted-foreground">No statistically meaningful changes detected.</p>;
  }
  return (
    <ul className="space-y-2 text-xs">
      {changes.slice(0, 8).map((c) => (
        <li key={c.id} className="rounded-lg border border-white/10 px-3 py-2 flex justify-between gap-2">
          <div>
            <p className="font-semibold">{c.label}</p>
            <p className="text-muted-foreground">{c.evidence}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={c.direction === "down" ? "text-rose-400" : "text-emerald-400"}>
              7d {c.changeVs7dPct != null ? `${c.changeVs7dPct > 0 ? "+" : ""}${c.changeVs7dPct}%` : "—"}
            </p>
            <StatusBadge status={c.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CorrelationChains({ chains }: { chains: EvidenceChain[] }) {
  if (chains.length === 0) return null;
  return (
    <div className="space-y-3">
      {chains.slice(0, 4).map((chain) => (
        <div key={chain.id} className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs">
          <div className="flex items-start gap-2">
            <GitBranch className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{chain.hypothesis}</p>
              <p className="text-muted-foreground mt-1">
                {chain.chain.map((l) => `${l.label} ${l.direction}`).join(" → ")}
              </p>
              {chain.recommendedInvestigation && (
                <p className="text-[10px] text-violet-300/80 mt-1">Investigate: {chain.recommendedInvestigation}</p>
              )}
              <p className="text-[10px] mt-1">Confidence {chain.confidence}% · <StatusBadge status={chain.status} /></p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeeklyReviewCard({ review }: { review: WeeklyExecutiveReview }) {
  return (
    <div className="rounded-xl border border-white/10 p-4 space-y-3 text-xs">
      <h4 className="font-semibold font-quicksand">Weekly Executive Review — week ending {review.weekEnding}</h4>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-emerald-400 font-semibold mb-1">Top wins</p>
          <ul className="list-disc list-inside text-muted-foreground">{review.topWins.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
        <div>
          <p className="text-[10px] text-rose-400 font-semibold mb-1">Top regressions</p>
          <ul className="list-disc list-inside text-muted-foreground">{review.topRegressions.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </div>
      <p><span className="text-muted-foreground">Revenue:</span> {review.revenueSummary}</p>
      <p><span className="text-muted-foreground">Retention:</span> {review.retentionSummary}</p>
      <p><span className="text-muted-foreground">Activation:</span> {review.activationSummary}</p>
      <p><span className="text-muted-foreground">Reliability:</span> {review.reliabilitySummary}</p>
      {review.recommendations.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold mb-1">Recommendations</p>
          <ul className="list-disc list-inside">{review.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export function OperationsSection({ operations }: { operations: GrowthOperationsPayload }) {
  return (
    <div className="space-y-6 border-t border-white/10 pt-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <h3 className="font-quicksand font-bold text-sm">Autonomous Growth Operations</h3>
        <span className="text-[10px] text-muted-foreground">Growth OS v2</span>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <h4 className="text-xs font-semibold font-quicksand mb-3 flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5" />
          Founder Action Queue
        </h4>
        <ActionQueueTable actions={operations.actionQueue} />
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 p-4">
          <h4 className="text-xs font-semibold font-quicksand mb-3">Daily Change Detection</h4>
          <ChangesList changes={operations.changes} />
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <h4 className="text-xs font-semibold font-quicksand mb-3">Root Cause Correlation</h4>
          <CorrelationChains chains={operations.correlations} />
        </div>
      </div>

      {operations.regressions.length > 0 && (
        <div className="rounded-xl border border-rose-500/20 p-4 text-xs">
          <h4 className="font-semibold mb-2">Deploy Regressions</h4>
          <ul className="space-y-1">
            {operations.regressions.map((r) => (
              <li key={r.id}>
                v{r.releaseVersion}: {r.label} {r.changePct}% — {r.evidence}
              </li>
            ))}
          </ul>
        </div>
      )}

      {operations.experiments.length > 0 && (
        <div className="rounded-xl border border-white/10 p-4 text-xs">
          <h4 className="font-semibold mb-2">Experiment Decisions</h4>
          <ul className="space-y-1">
            {operations.experiments.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.name}</span> —{" "}
                <span className={e.decision === "ship" ? "text-emerald-400" : e.decision === "rollback" ? "text-rose-400" : "text-amber-400"}>
                  {e.decision}
                </span>
                : {e.recommendedAction}
              </li>
            ))}
          </ul>
        </div>
      )}

      <WeeklyReviewCard review={operations.weeklyReview} />

      {operations.dataQuality.sampleWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-400">
          Data quality: {operations.dataQuality.sampleWarnings.join(" · ")}
        </div>
      )}
    </div>
  );
}
