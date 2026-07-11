import { IndianRupee, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RevenueIntelligencePayload } from "./gos-types";

function EvidenceTag({ cls }: { cls: string }) {
  const color =
    cls === "measured"
      ? "text-emerald-400"
      : cls === "estimated"
        ? "text-amber-400"
        : "text-muted-foreground";
  return <span className={cn("text-[9px] uppercase font-semibold", color)}>{cls.replace(/_/g, " ")}</span>;
}

function FinanceBriefCard({ brief }: { brief: RevenueIntelligencePayload["financeBrief"] }) {
  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2">
        <IndianRupee className="h-4 w-4 text-emerald-400" />
        <h3 className="font-quicksand font-bold text-sm">Founder Finance Brief — {brief.date}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{brief.revenueSummary}</p>
      <p className="text-xs">{brief.mrrTrend}</p>
      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[10px] text-emerald-400 font-semibold mb-1">Top revenue drivers</p>
          <ul className="list-disc list-inside text-muted-foreground">{brief.topRevenueDrivers.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div>
          <p className="text-[10px] text-rose-400 font-semibold mb-1">Top risks</p>
          <ul className="list-disc list-inside text-muted-foreground">{brief.topRisks.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <p><span className="text-muted-foreground">Renewals:</span> {brief.expectedRenewals}</p>
        <p><span className="text-muted-foreground">Churn:</span> {brief.expectedChurn}</p>
      </div>
      {brief.projectedMrr30d.status !== "not_verified" && brief.projectedMrr30d.value != null && (
        <p className="text-xs">
          Projected MRR 30d: ₹{brief.projectedMrr30d.value} [{brief.projectedMrr30d.low}–{brief.projectedMrr30d.high}] ({brief.projectedMrr30d.status})
        </p>
      )}
      <div>
        <p className="text-[10px] font-semibold mb-1">Recommended actions</p>
        <ul className="text-xs list-disc list-inside">{brief.recommendedActions.map((a) => <li key={a}>{a}</li>)}</ul>
      </div>
    </div>
  );
}

function KpiGrid({ kpis }: { kpis: RevenueIntelligencePayload["financialKpis"] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {kpis.map((k) => (
        <div key={k.key} className="rounded-lg border border-white/10 px-2.5 py-2 text-xs">
          <p className="text-[9px] uppercase text-primary/60 truncate">{k.label}</p>
          <p className="font-bold font-quicksand text-base mt-0.5">
            {k.value == null
              ? "—"
              : k.unit === "inr"
                ? `₹${k.value.toLocaleString()}`
                : k.unit === "pct"
                  ? `${k.value}%`
                  : k.value.toLocaleString()}
          </p>
          <EvidenceTag cls={k.evidenceClass} />
          {k.note && <p className="text-[9px] text-amber-400/90 mt-1 line-clamp-2">{k.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function RevenueIntelligenceSection({ data }: { data: RevenueIntelligencePayload }) {
  return (
    <div className="space-y-6 border-t border-white/10 pt-6">
      <div className="flex items-center gap-2">
        <IndianRupee className="h-4 w-4 text-emerald-400" />
        <h3 className="font-quicksand font-bold text-sm">Revenue Intelligence OS</h3>
      </div>

      <FinanceBriefCard brief={data.financeBrief} />

      <div className="rounded-xl border border-white/10 p-4">
        <h4 className="text-xs font-semibold font-quicksand mb-3">Financial KPIs</h4>
        <KpiGrid kpis={data.financialKpis} />
      </div>

      <div className="rounded-xl border border-white/10 p-4">
        <h4 className="text-xs font-semibold font-quicksand mb-3">Subscription Funnel</h4>
        <div className="space-y-1 text-xs">
          {data.subscriptionFunnel.map((s, idx) => (
            <div key={s.key}>
              {idx > 0 && <p className="text-center text-muted-foreground py-0.5">↓</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-white/10 px-3 py-2">
                <span className="font-semibold">{s.label}</span>
                <span>{s.users} users</span>
                {s.dropPct != null && s.dropPct > 0 && <span className="text-rose-400">-{s.dropPct}%</span>}
                {s.conversionPct != null && <span className="text-emerald-400">{s.conversionPct}% conv</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 p-4 overflow-x-auto">
        <h4 className="text-xs font-semibold font-quicksand mb-3">Feature Revenue Attribution (correlation)</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-white/10">
              <th className="px-2 py-1">Feature</th>
              <th className="px-2 py-1">Pre-purchase users</th>
              <th className="px-2 py-1">Purchase corr %</th>
              <th className="px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.featureAttribution.map((f) => (
              <tr key={f.feature} className="border-b border-white/5">
                <td className="px-2 py-1.5">#{f.rank} {f.label}</td>
                <td className="px-2 py-1.5">{f.usersBeforePurchase}</td>
                <td className="px-2 py-1.5">{f.purchaseCorrelationPct ?? "—"}%</td>
                <td className="px-2 py-1.5"><EvidenceTag cls={f.evidenceClass} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-muted-foreground mt-2 italic">{data.featureAttribution[0]?.disclaimer}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-xs">
        <div className="rounded-xl border border-white/10 p-4">
          <h4 className="font-semibold mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Churn intelligence</h4>
          {[...data.churnIntelligence.subscribersAtRisk, ...data.churnIntelligence.renewalRisk].map((c) => (
            <p key={c.segment} className="text-muted-foreground mb-1">{c.segment}: {c.users} users, risk {c.riskScore} ({c.confidencePct}% conf)</p>
          ))}
          {data.churnIntelligence.paymentFailures > 0 && (
            <p className="text-rose-400">Payment failures: {data.churnIntelligence.paymentFailures}</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <h4 className="font-semibold mb-2">Pricing experiments</h4>
          {data.experimentAttribution.map((e) => (
            <p key={e.id} className="mb-1">
              {e.name}: <span className={e.decision === "ship" ? "text-emerald-400" : "text-amber-400"}>{e.decision}</span> — {e.evidence}
            </p>
          ))}
        </div>
      </div>

      {data.dataGaps.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-400">
          {data.dataGaps.join(" · ")}
        </div>
      )}
    </div>
  );
}
