/**
 * DEV-only Learning Telemetry dashboard.
 * Not mounted in production routes.
 */

import { useEffect, useState } from "react";
import type { TelemetrySnapshot } from "@workspace/learning-telemetry";
import {
  getLearningTelemetrySnapshot,
  installLearningTelemetry,
} from "@/lib/learning-telemetry-host";

function Spark({ values, color = "#38bdf8" }: { values: number[]; color?: string }) {
  if (!values.length) {
    return <div className="h-10 rounded bg-black/20" />;
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(0.0001, max - min);
  const w = 160;
  const h = 40;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/25 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-slate-100">{value}</div>
    </div>
  );
}

export function LearningTelemetryDashboard({
  embedded = false,
  onClose,
}: {
  embedded?: boolean;
  onClose?: () => void;
}) {
  const [snap, setSnap] = useState<TelemetrySnapshot | null>(null);

  useEffect(() => {
    installLearningTelemetry();
    const refresh = () => setSnap(getLearningTelemetrySnapshot());
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, []);

  if (!snap) {
    return <p className="text-sm text-muted-foreground">Collecting telemetry…</p>;
  }

  const healthColor =
    snap.healthScore >= 85
      ? "text-emerald-400"
      : snap.healthScore >= 70
        ? "text-amber-300"
        : "text-rose-400";

  return (
    <div
      className={
        embedded
          ? "space-y-3 text-slate-100"
          : "max-h-[80vh] overflow-auto rounded-xl border border-white/10 bg-slate-950/95 p-3 text-slate-100 shadow-xl"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Learning Telemetry</h2>
          <p className="text-[11px] text-slate-400">
            Production collectors · explain issues in minutes · no user-facing UI
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-white/10"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="flex items-end gap-3">
        <div>
          <div className="text-[10px] uppercase text-slate-400">Health score</div>
          <div className={`font-mono text-3xl font-semibold ${healthColor}`}>
            {snap.healthScore}
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          uptime {Math.round(snap.uptimeMs / 1000)}s · alerts {snap.alerts.length}
        </div>
      </div>

      {snap.warnings.length > 0 ? (
        <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
          <div className="text-[10px] font-semibold uppercase text-amber-200">Warnings</div>
          {snap.warnings.map((w) => (
            <div key={w} className="text-[11px] text-amber-100">
              {w}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-emerald-400/90">No active warnings</div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Decision p95"
          value={`${snap.decisionLatency.p95Ms.toFixed(2)}ms`}
        />
        <Stat label="Queue depth" value={snap.bus.queueDepthLast} />
        <Stat label="KG nodes" value={snap.kg.nodeCount} />
        <Stat
          label="Snapshot"
          value={`${Math.round(snap.kg.snapshotBytes / 1024)} KB`}
        />
        <Stat label="Cooldown hits" value={snap.runtime.cooldownHits} />
        <Stat label="Dupes blocked" value={snap.bus.duplicatesPrevented} />
        <Stat label="Repairs" value={snap.kg.repairCount} />
        <Stat label="FPS" value={snap.perf.fps ?? "—"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <div className="mb-1 text-[10px] uppercase text-slate-400">
            Decision latency trend
          </div>
          <Spark values={snap.trends.decisionLatencyMs} color="#38bdf8" />
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <div className="mb-1 text-[10px] uppercase text-slate-400">Queue depth trend</div>
          <Spark values={snap.trends.queueDepth} color="#a78bfa" />
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <div className="mb-1 text-[10px] uppercase text-slate-400">Snapshot size</div>
          <Spark values={snap.trends.snapshotBytes} color="#34d399" />
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <div className="mb-1 text-[10px] uppercase text-slate-400">Health trend</div>
          <Spark values={snap.trends.healthScore} color="#fbbf24" />
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-black/20 p-2">
        <div className="mb-1 text-[10px] uppercase text-slate-400">Top slow rules</div>
        {snap.topSlowRules.length === 0 ? (
          <div className="text-[11px] text-slate-500">No samples yet</div>
        ) : (
          <ul className="space-y-1 font-mono text-[11px]">
            {snap.topSlowRules.map((r) => (
              <li key={r.ruleId} className="flex justify-between gap-2">
                <span className="truncate text-slate-200">{r.ruleId}</span>
                <span className="shrink-0 text-slate-400">
                  avg {r.avgMs.toFixed(2)}ms · max {r.maxMs.toFixed(2)}ms · n={r.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-black/20 p-2">
        <div className="mb-1 text-[10px] uppercase text-slate-400">
          Largest snapshots / storage
        </div>
        <ul className="space-y-1 font-mono text-[11px]">
          {snap.largestSnapshots.map((s) => (
            <li key={s.label} className="flex justify-between">
              <span>{s.label}</span>
              <span>{Math.round(s.bytes / 1024)} KB</span>
            </li>
          ))}
          <li className="flex justify-between text-slate-400">
            <span>storage growth</span>
            <span>{Math.round(snap.kg.storageGrowthBytes / 1024)} KB</span>
          </li>
          <li className="flex justify-between text-slate-400">
            <span>heap</span>
            <span>
              {snap.perf.heapUsedMb ?? "n/a"} / {snap.perf.heapTotalMb ?? "n/a"} MB
            </span>
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-4">
        <div>recs accept {snap.runtime.recommendationAccepted}</div>
        <div>recs ignore {snap.runtime.recommendationIgnored}</div>
        <div>review max {snap.runtime.reviewQueueMax}</div>
        <div>attention Δ {snap.runtime.attentionTransitions}</div>
        <div>kg updates {snap.runtime.knowledgeUpdates}</div>
        <div>flushes {snap.bus.flushes}</div>
        <div>replays {snap.bus.replays}</div>
        <div>bundle {snap.perf.bundleLoadMs?.toFixed?.(0) ?? "—"}ms</div>
      </div>
    </div>
  );
}
