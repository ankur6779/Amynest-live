import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  Lock,
  RefreshCw,
  Shield,
  Volume2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardStatus = "healthy" | "degraded" | "failing";

interface DashboardData {
  windowMs: number;
  generatedAt: number;
  totalRequests: number;
  successRate: number;
  fallbackRate: number;
  failureRate: number;
  avgTTFA: number;
  avgBuffering: number;
  status: DashboardStatus;
  perModuleStats: Array<{
    module: string;
    label: string;
    total: number;
    success: number;
    failure: number;
    fallback: number;
    avgTtfaMs: number;
  }>;
  layerHealth: Array<{
    layer: string;
    total: number;
    success: number;
    failure: number;
    successPct: number;
    failurePct: number;
    usagePct: number;
    avgTtfaMs: number;
  }>;
  cacheHealth: {
    hitRate: number;
    missRate: number;
    invalidBlobCount: number;
    prefetchSuccessRate: number;
  };
  apiHealth: {
    routes: Array<{
      route: string;
      label: string;
      total: number;
      successRate: number;
      avgLatencyMs: number;
      errorRate: number;
      alert: boolean;
    }>;
  };
  errorFeed: Array<{
    time: number;
    module: string;
    error: string;
    layer?: string;
  }>;
  sessionFlows: Array<{
    sessionId: string;
    module: string;
    outcome: string;
    steps: Array<{
      event: string;
      layer?: string;
      errorType?: string;
    }>;
  }>;
  deviceNetworkHeatmap: Array<{
    device: string;
    network: string;
    total: number;
    failures: number;
    failPct: number;
  }>;
  trends24h: Array<{
    hour: string;
    successRate: number;
    failureRate: number;
    total: number;
  }>;
  alerts: Array<{
    code: string;
    message: string;
    severity: string;
    emoji: string;
  }>;
  ops: {
    disableStreaming: boolean;
    disableApi: boolean;
    forceEmergencyMode: boolean;
    cacheClearedAt: number | null;
  };
}

type AdminAction =
  | "disable_streaming"
  | "enable_streaming"
  | "disable_api"
  | "enable_api"
  | "clear_cache"
  | "force_emergency"
  | "reset_emergency"
  | "reset_all";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function StatusBadge({ status }: { status: DashboardStatus }) {
  const cls =
    status === "healthy"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : status === "degraded"
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";
  const emoji = status === "healthy" ? "🟢" : status === "degraded" ? "🟡" : "🔴";
  const label =
    status === "healthy" ? "Healthy" : status === "degraded" ? "Degraded" : "Failing";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", cls)}>
      {emoji} {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 flex-1 min-w-[140px]">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground font-quicksand mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <h2 className="font-semibold font-quicksand">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function formatSessionSteps(
  steps: DashboardData["sessionFlows"][0]["steps"],
): string {
  return steps
    .map((s) => {
      if (s.event === "audio_fallback") return "fallback";
      if (s.event === "audio_failure") return `fail(${s.errorType ?? "?"})`;
      if (s.event === "audio_success") return `success(${s.layer ?? "?"})`;
      if (s.event === "audio_start") return "play";
      return s.event.replace("audio_", "");
    })
    .join(" → ");
}

export default function AdminDashboardPage() {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const res = await authFetch("/api/admin/dashboard");
      if (res.status === 403) throw new Error("not_admin");
      if (!res.ok) throw new Error(`http_${res.status}`);
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const actionMutation = useMutation({
    mutationFn: async (action: AdminAction) => {
      const res = await authFetch("/api/admin/dashboard/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("action_failed");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  if (error instanceof Error && error.message === "not_admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground font-quicksand">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your user ID needs to be added to the{" "}
            <code className="bg-white/10 px-1 rounded text-xs">ADMIN_USER_IDS</code> environment variable.
          </p>
          <Link href="/dashboard">
            <button type="button" className="text-sm text-primary hover:underline">
              ← Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const maxTrend = Math.max(...(data?.trends24h.map((t) => t.total) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-pink-500/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 pb-24 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href="/dashboard">
              <button type="button" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-3">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Dashboard
              </button>
            </Link>
            <h1 className="text-2xl font-bold font-quicksand flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              System Health Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time audio, API, and cache monitoring · 15 min window
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && <StatusBadge status={data.status} />}
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading metrics…</p>}

        {data && (
          <>
            {/* 1. Global overview */}
            <div className="flex flex-wrap gap-3">
              <StatCard
                label="System Status"
                value={data.status === "healthy" ? "Healthy" : data.status === "degraded" ? "Degraded" : "Failing"}
                icon={<Activity className="h-3 w-3 text-primary/60" />}
              />
              <StatCard
                label="Audio Success"
                value={pct(data.successRate)}
                icon={<Volume2 className="h-3 w-3 text-primary/60" />}
              />
              <StatCard
                label="Avg TTFA"
                value={`${Math.round(data.avgTTFA)}ms`}
                icon={<Zap className="h-3 w-3 text-primary/60" />}
              />
              <StatCard
                label="Failure Rate"
                value={pct(data.failureRate)}
                sub={`${data.totalRequests} events`}
              />
            </div>

            {/* 9. Alerts */}
            {data.alerts.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Active alerts
                </p>
                {data.alerts.map((alert) => (
                  <p key={alert.code} className="text-xs text-amber-100/90">
                    {alert.emoji} {alert.message}
                  </p>
                ))}
              </div>
            )}

            {/* 10. Quick actions */}
            <Section title="Quick Actions">
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  label={data.ops.disableStreaming ? "Enable Streaming" : "Disable Streaming"}
                  active={data.ops.disableStreaming}
                  onClick={() =>
                    actionMutation.mutate(data.ops.disableStreaming ? "enable_streaming" : "disable_streaming")
                  }
                  loading={actionMutation.isPending}
                />
                <ActionButton
                  label={data.ops.disableApi ? "Enable API" : "Disable API"}
                  active={data.ops.disableApi}
                  onClick={() =>
                    actionMutation.mutate(data.ops.disableApi ? "enable_api" : "disable_api")
                  }
                  loading={actionMutation.isPending}
                />
                <ActionButton
                  label="Clear Cache"
                  onClick={() => actionMutation.mutate("clear_cache")}
                  loading={actionMutation.isPending}
                />
                <ActionButton
                  label={data.ops.forceEmergencyMode ? "Reset Emergency" : "Force Emergency"}
                  active={data.ops.forceEmergencyMode}
                  danger
                  onClick={() =>
                    actionMutation.mutate(
                      data.ops.forceEmergencyMode ? "reset_emergency" : "force_emergency",
                    )
                  }
                  loading={actionMutation.isPending}
                />
                <ActionButton
                  label="Reset All"
                  onClick={() => actionMutation.mutate("reset_all")}
                  loading={actionMutation.isPending}
                />
              </div>
              {data.ops.cacheClearedAt && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Cache cleared {new Date(data.ops.cacheClearedAt).toLocaleString()}
                </p>
              )}
            </Section>

            {/* 2. Audio health */}
            <Section title="Audio Health">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <MiniStat label="Success" value={pct(data.successRate)} />
                <MiniStat label="Failure" value={pct(data.failureRate)} />
                <MiniStat label="Fallback" value={pct(data.fallbackRate)} />
                <MiniStat label="Avg TTFA" value={`${Math.round(data.avgTTFA)}ms`} />
                <MiniStat label="Buffering" value={data.avgBuffering.toFixed(1)} />
              </div>
              <DataTable
                headers={["Module", "Success", "Fail", "Fallback", "TTFA"]}
                rows={data.perModuleStats.map((row) => [
                  row.label,
                  String(row.success),
                  String(row.failure),
                  String(row.fallback),
                  `${Math.round(row.avgTtfaMs)}ms`,
                ])}
              />
            </Section>

            {/* 3. Layer health */}
            <Section title="Layer Health">
              <div className="space-y-3">
                {data.layerHealth.map((row) => (
                  <div key={row.layer}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium capitalize">{row.layer}</span>
                      <span className="text-muted-foreground">
                        {pct(row.usagePct)} usage · {pct(row.successPct)} ok · {pct(row.failurePct)} fail ·{" "}
                        {Math.round(row.avgTtfaMs)}ms TTFA
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500/80"
                        style={{ width: `${Math.round(row.successPct * 100)}%` }}
                      />
                      <div
                        className="h-full bg-red-500/60"
                        style={{ width: `${Math.round(row.failurePct * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* 4. API health + 5. Cache health */}
            <div className="grid md:grid-cols-2 gap-4">
              <Section title="API Health">
                <DataTable
                  headers={["API", "Success", "Latency", "Errors"]}
                  rows={data.apiHealth.routes.map((row) => [
                    row.label,
                    row.total > 0 ? pct(row.successRate) : "—",
                    row.total > 0 ? `${Math.round(row.avgLatencyMs)}ms` : "—",
                    row.total > 0 ? pct(row.errorRate) : "—",
                  ])}
                  rowAlert={(idx) => data.apiHealth.routes[idx]?.alert ?? false}
                />
              </Section>
              <Section title="Cache Health">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Hit Rate" value={pct(data.cacheHealth.hitRate)} />
                  <MiniStat label="Miss Rate" value={pct(data.cacheHealth.missRate)} />
                  <MiniStat label="Invalid Blobs" value={String(data.cacheHealth.invalidBlobCount)} />
                  <MiniStat label="Prefetch OK" value={pct(data.cacheHealth.prefetchSuccessRate)} />
                </div>
              </Section>
            </div>

            {/* 12. 24h trends */}
            <Section title="24h Trends">
              <div className="flex items-end gap-0.5 h-24">
                {data.trends24h.map((bucket) => (
                  <div
                    key={bucket.hour}
                    className="flex-1 min-w-0 flex flex-col justify-end group relative"
                    title={`${new Date(bucket.hour).toLocaleTimeString()} · ${bucket.total} events · ${pct(bucket.failureRate)} fail`}
                  >
                    <div
                      className="w-full bg-primary/60 rounded-t-sm min-h-[2px]"
                      style={{ height: `${Math.max(4, (bucket.total / maxTrend) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Hourly event volume (last 24h)</p>
            </Section>

            {/* 6. Error feed + 7. Session flows */}
            <div className="grid lg:grid-cols-2 gap-4">
              <section className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  <h2 className="font-semibold font-quicksand">Real-Time Error Feed</h2>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-muted-foreground sticky top-0 bg-background">
                      <tr className="border-b border-white/10">
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Module</th>
                        <th className="px-3 py-2">Error</th>
                        <th className="px-3 py-2">Layer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.errorFeed.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-muted-foreground text-center">
                            No errors in window
                          </td>
                        </tr>
                      )}
                      {data.errorFeed.map((row, idx) => (
                        <tr key={`${row.time}-${idx}`} className="border-b border-white/5">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {new Date(row.time).toLocaleTimeString()}
                          </td>
                          <td className="px-3 py-2">{row.module}</td>
                          <td className="px-3 py-2 text-red-300">{row.error}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.layer ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  <h2 className="font-semibold font-quicksand">User Session Flows</h2>
                </div>
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {data.sessionFlows.length === 0 && (
                    <p className="px-4 py-6 text-sm text-muted-foreground">No sessions yet</p>
                  )}
                  {data.sessionFlows.map((flow) => (
                    <div key={flow.sessionId} className="px-4 py-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium capitalize">{flow.module}</span>
                        <span
                          className={cn(
                            flow.outcome === "success"
                              ? "text-emerald-400"
                              : flow.outcome === "failure"
                                ? "text-red-400"
                                : "text-muted-foreground",
                          )}
                        >
                          {flow.outcome}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                        tap → {formatSessionSteps(flow.steps)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* 8. Device + network heatmap */}
            <Section title="Device + Network Heatmap">
              <DataTable
                headers={["Device", "Network", "Fail %", "Failures", "Total"]}
                rows={data.deviceNetworkHeatmap
                  .sort((a, b) => b.failPct - a.failPct)
                  .slice(0, 12)
                  .map((row) => [
                    row.device,
                    row.network,
                    pct(row.failPct),
                    String(row.failures),
                    String(row.total),
                  ])}
              />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-quicksand">{value}</p>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  rowAlert,
}: {
  headers: string[];
  rows: string[][];
  rowAlert?: (idx: number) => boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b border-white/10">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                "border-b border-white/5",
                rowAlert?.(idx) && "bg-red-500/5",
              )}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  loading,
  active,
  danger,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
        active
          ? danger
            ? "border-red-500/40 bg-red-500/15 text-red-300"
            : "border-amber-500/40 bg-amber-500/15 text-amber-300"
          : "border-white/10 hover:bg-white/5 text-foreground",
      )}
    >
      {label}
    </button>
  );
}
