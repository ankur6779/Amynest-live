import type { CtoOpsSnapshot } from "./types";
import { PerformancePanel } from "./performance-panel";

export function CtoModePanel({ ops }: { ops: CtoOpsSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "API Latency (p50)", value: ops.apiLatencyMs != null ? `${ops.apiLatencyMs}ms` : "—" },
          { label: "Crashes", value: ops.crashCount },
          { label: "JS Errors", value: ops.jsErrors },
          { label: "Network Errors", value: ops.networkErrors },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.label}</p>
            <p className="text-lg font-bold font-quicksand">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs font-semibold mb-2">Queue & Workers</p>
          <dl className="text-[11px] space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="font-mono">{ops.queue.mode}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Redis</dt>
              <dd>{ops.queue.redisConnected ? "Connected" : "Disconnected"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Queue status</dt>
              <dd>{ops.queue.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">DLQ entries</dt>
              <dd>{ops.queue.dlqCount}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs font-semibold mb-2">Analytics Ingestion</p>
          <dl className="text-[11px] space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Accepted (process)</dt>
              <dd>{ops.analyticsIngest.accepted.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Invalid rate</dt>
              <dd>{(ops.analyticsIngest.invalidRate * 100).toFixed(1)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Unknown events</dt>
              <dd>{ops.analyticsIngest.rejectedUnknown}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Database</dt>
              <dd>{ops.database.status}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 p-3">
        <p className="text-xs font-semibold mb-2">Version Adoption</p>
        {ops.versionAdoption.length === 0 ? (
          <p className="text-xs text-muted-foreground">No version data</p>
        ) : (
          <div className="space-y-1">
            {ops.versionAdoption.slice(0, 8).map((v) => (
              <div key={v.version} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 truncate font-mono">{v.version}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${v.pct}%` }} />
                </div>
                <span className="w-16 text-right text-muted-foreground">
                  {v.users} ({v.pct}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <PerformancePanel performance={ops.performance} />
    </div>
  );
}
