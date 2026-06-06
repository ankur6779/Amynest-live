import { useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  getSelfHealingDashboardSnapshot,
  type SelfHealingDashboardSnapshot,
} from "@/lib/self-healing/dashboard";

type AuditFingerprint = {
  readableFingerprint: string;
  severity: string;
  count24h: number;
  affectedUsers: number;
  recoverySuccessRate: number;
  exampleErrorIds: string[];
};

type AuditEntry = {
  aggregate: AuditFingerprint;
  rootCause: { chain: string[]; component: string } | null;
  fixSuggestion: { minimalFix: string; regressionRisk: string } | null;
  regression: { status: string; testPaths: string[] } | null;
};

type CrashAuditReport = {
  globalRecoveryRate: number;
  launchGate: { pass: boolean; blockers: string[] };
  entries: AuditEntry[];
};

/**
 * Level 11 — Ops visibility for self-healing (session snapshot + server crash intelligence).
 */
export function SelfHealingOpsPanel() {
  const authFetch = useAuthFetch();
  const [snapshot, setSnapshot] = useState<SelfHealingDashboardSnapshot | null>(null);
  const [audit, setAudit] = useState<CrashAuditReport | null>(null);
  const [serverCrashes, setServerCrashes] = useState<
    Array<{ message: string; ts: number; userId: string | null }>
  >([]);

  useEffect(() => {
    setSnapshot(getSelfHealingDashboardSnapshot());
  }, []);

  useEffect(() => {
    void authFetch("/api/admin/crash-intelligence/audit?limit=8")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CrashAuditReport | null) => {
        if (data?.entries) setAudit(data);
      })
      .catch(() => {});

    void authFetch("/api/logs/recent")
      .then((r) => (r.ok ? r.json() : { logs: [] }))
      .then((data: { logs?: Array<{ message: string; ts: number; userId: string | null; type: string }> }) => {
        const crashes = (data.logs ?? [])
          .filter((l) => l.type === "crash")
          .slice(-15)
          .reverse();
        setServerCrashes(crashes);
      })
      .catch(() => {});
  }, [authFetch]);

  if (!snapshot) return null;

  const { recoveryStats, topFingerprints, quarantinedRoutes, mitigatedFeatures } = snapshot;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
      <h2 className="font-quicksand text-lg font-bold">Self-Healing Ops</h2>
      <p className="text-xs text-muted-foreground">
        Runtime recovery only — no automatic source code changes. Session aggregates + 7-day crash intelligence audit.
      </p>

      {audit && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex flex-wrap gap-3 text-xs">
            <span>
              Global recovery: <strong>{audit.globalRecoveryRate}%</strong>
            </span>
            <span className={audit.launchGate.pass ? "text-emerald-400" : "text-red-400"}>
              Launch gate: {audit.launchGate.pass ? "PASS" : "BLOCKED"}
            </span>
          </div>
          {audit.launchGate.blockers.length > 0 && (
            <ul className="text-[11px] text-red-300/90 list-disc pl-4">
              {audit.launchGate.blockers.slice(0, 3).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {audit && audit.entries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Production crash fingerprints (7d)</h3>
          <ul className="text-[11px] space-y-2 max-h-56 overflow-y-auto">
            {audit.entries.map((e) => (
              <li key={e.aggregate.readableFingerprint} className="rounded border border-white/5 p-2">
                <div className="flex justify-between gap-2 font-mono">
                  <span className="truncate">{e.aggregate.readableFingerprint}</span>
                  <span className="shrink-0 text-amber-400">{e.aggregate.severity}</span>
                </div>
                <p className="text-muted-foreground mt-1">
                  {e.aggregate.count24h}/24h · {e.aggregate.affectedUsers} users · recovery{" "}
                  {e.aggregate.recoverySuccessRate}%
                </p>
                {e.fixSuggestion && (
                  <p className="text-muted-foreground mt-1 line-clamp-2">
                    Fix: {e.fixSuggestion.minimalFix}
                  </p>
                )}
                {e.regression && (
                  <p className="text-muted-foreground">
                    Tests: {e.regression.status} ({e.regression.testPaths.length} files)
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Mini label="Recovery success" value={`${recoveryStats.successRate}%`} />
        <Mini label="Auto-recovered" value={String(recoveryStats.autoRecovered)} />
        <Mini label="Manual required" value={String(recoveryStats.manualRequired)} />
        <Mini label="Quarantined" value={String(recoveryStats.quarantined)} />
      </div>

      {topFingerprints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Top crash fingerprints (session)</h3>
          <ul className="text-xs font-mono space-y-1">
            {topFingerprints.map((f) => (
              <li key={f.fingerprint} className="flex justify-between gap-2">
                <span className="truncate">{f.fingerprint}</span>
                <span className="text-muted-foreground shrink-0">×{f.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mitigatedFeatures.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Mitigated features (session)</h3>
          <p className="text-xs font-mono text-amber-400">{mitigatedFeatures.join(", ")}</p>
        </div>
      )}

      {quarantinedRoutes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Quarantined routes</h3>
          <ul className="text-xs font-mono space-y-1">
            {quarantinedRoutes.map((q) => (
              <li key={`${q.route}-${q.component}`}>
                {q.component} @ {q.route}
              </li>
            ))}
          </ul>
        </div>
      )}

      {serverCrashes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Recent server crash logs</h3>
          <ul className="text-[11px] font-mono space-y-1 max-h-40 overflow-y-auto">
            {serverCrashes.map((c, i) => (
              <li key={`${c.ts}-${i}`} className="text-muted-foreground truncate">
                {new Date(c.ts).toISOString().slice(11, 19)} {c.message.slice(0, 120)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/10 px-2 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}
