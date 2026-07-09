import { cn } from "@/lib/utils";
import { useGosSection } from "./use-gos-section";
import type { GrowthTimePreset } from "./types";

export type PreSignupFunnelStage = {
  key: string;
  label: string;
  users: number;
  conversionPct: number | null;
  dropPct: number | null;
  broken: boolean;
  brokenReason: string | null;
};

export type PreSignupHealthMetrics = {
  permissionRate: number | null;
  schedulingRate: number | null;
  deliveryRate: number | null;
  openRate: number | null;
  signupRate: number | null;
  trialRate: number | null;
  conversionRate: number | null;
  attributionRate: number | null;
  overallHealthScore: number;
  alertRaised: boolean;
};

export type PreSignupAndroidSummary = {
  androidFirstOpens: number;
  permissionChecked: number;
  permissionGrantedPct: number | null;
  campaignEligiblePct: number | null;
  campaignScheduledPct: number | null;
  nativeScheduleSuccessPct: number | null;
  deliveredPct: number | null;
  openedPct: number | null;
  signupStartedPct: number | null;
  healthScore: number;
  lastFailureReason: string | null;
  topBlockReason: string | null;
};

export type PreSignupFunnelData = {
  stages: PreSignupFunnelStage[];
  health: PreSignupHealthMetrics;
  android: PreSignupAndroidSummary;
  generatedAt: string;
};

function pct(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function HealthMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold font-quicksand mt-1">{pct(value)}</p>
    </div>
  );
}

export function PreSignupFunnelPanel({
  preset,
  customStart,
  customEnd,
}: {
  preset: GrowthTimePreset;
  customStart: string;
  customEnd: string;
}) {
  const { data, isLoading, error } = useGosSection<PreSignupFunnelData>(
    "pre-signup",
    preset,
    customStart,
    customEnd,
  );

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-8 text-center">Loading pre-signup funnel…</p>;
  }

  if (error || !data?.data) {
    return (
      <p className="text-xs text-rose-400 py-8 text-center">
        Failed to load pre-signup funnel data.
      </p>
    );
  }

  const funnel = data.data;
  const { health, stages, android } = funnel;

  const androidRows = [
    { label: "Android First Opens", value: String(android.androidFirstOpens) },
    { label: "Permission Checked", value: String(android.permissionChecked) },
    { label: "Permission Granted %", value: pct(android.permissionGrantedPct) },
    { label: "Campaign Eligible %", value: pct(android.campaignEligiblePct) },
    { label: "Campaign Scheduled %", value: pct(android.campaignScheduledPct) },
    { label: "Native Schedule Success %", value: pct(android.nativeScheduleSuccessPct) },
    { label: "Delivered %", value: pct(android.deliveredPct) },
    { label: "Opened %", value: pct(android.openedPct) },
    { label: "Signup Started %", value: pct(android.signupStartedPct) },
    { label: "Health Score", value: `${android.healthScore}/100` },
    { label: "Last Failure Reason", value: android.lastFailureReason ?? "—" },
    { label: "Top Block Reason", value: android.topBlockReason ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-white/10 bg-white/[0.02]">
              {androidRows.map((row) => (
                <th key={row.label} className="px-3 py-2 font-medium whitespace-nowrap">
                  {row.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {androidRows.map((row) => (
                <td
                  key={row.label}
                  className={cn(
                    "px-3 py-3 font-mono whitespace-nowrap",
                    row.label === "Health Score" && android.healthScore < 70 && "text-rose-300",
                    row.label === "Top Block Reason" && android.topBlockReason && "text-amber-300",
                    row.label === "Last Failure Reason" && android.lastFailureReason && "text-rose-300",
                  )}
                >
                  {row.value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className={cn(
          "rounded-xl border px-4 py-3 flex items-center justify-between",
          health.alertRaised
            ? "border-rose-500/40 bg-rose-500/10"
            : "border-emerald-500/30 bg-emerald-500/10",
        )}
      >
        <div>
          <p className="text-xs text-muted-foreground">Notification Health Score</p>
          <p className="text-2xl font-bold font-quicksand">{health.overallHealthScore}/100</p>
        </div>
        {health.alertRaised && (
          <span className="text-xs font-semibold text-rose-300 bg-rose-500/20 px-2 py-1 rounded">
            Alert: score &lt; 70
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HealthMetric label="Permission rate" value={health.permissionRate} />
        <HealthMetric label="Scheduling rate" value={health.schedulingRate} />
        <HealthMetric label="Delivery rate" value={health.deliveryRate} />
        <HealthMetric label="Open rate" value={health.openRate} />
        <HealthMetric label="Signup rate" value={health.signupRate} />
        <HealthMetric label="Trial rate" value={health.trialRate} />
        <HealthMetric label="Conversion rate" value={health.conversionRate} />
        <HealthMetric label="Attribution rate" value={health.attributionRate} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-white/10">
              <th className="py-2 pr-4">Stage</th>
              <th className="py-2 pr-4 text-right">Users</th>
              <th className="py-2 pr-4 text-right">Conv %</th>
              <th className="py-2 pr-4 text-right">Drop %</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, idx) => (
              <tr
                key={stage.key}
                className={cn(
                  "border-b border-white/5",
                  stage.broken && "bg-rose-500/5",
                )}
              >
                <td className="py-2.5 pr-4">
                  <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                  {stage.label}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono">{stage.users}</td>
                <td className="py-2.5 pr-4 text-right font-mono">
                  {stage.conversionPct !== null ? `${stage.conversionPct}%` : "—"}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono text-muted-foreground">
                  {stage.dropPct !== null ? `${stage.dropPct}%` : "—"}
                </td>
                <td className="py-2.5">
                  {stage.broken ? (
                    <span className="text-rose-300 text-[10px]" title={stage.brokenReason ?? ""}>
                      Broken
                    </span>
                  ) : (
                    <span className="text-emerald-400/80 text-[10px]">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Generated {new Date(funnel.generatedAt).toLocaleString()} · Phase A diagnostics required for
        permission/eligible stages
      </p>
    </div>
  );
}
