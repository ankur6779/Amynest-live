/**
 * Level 11 — Admin / ops visibility snapshot (client session aggregates).
 */

import { getFingerprintCounts } from "@/lib/self-healing/crash-intelligence";
import { getMitigatedFeatures } from "@/lib/self-healing/feature-mitigation";
import { getQuarantinedRoutes } from "@/lib/self-healing/route-quarantine";
import { getRecoveryStats, getRecoveryEvents } from "@/lib/self-healing/recovery-stats";

export type SelfHealingDashboardSnapshot = {
  generatedAt: string;
  topFingerprints: Array<{ fingerprint: string; count: number }>;
  recoveryStats: ReturnType<typeof getRecoveryStats>;
  quarantinedRoutes: ReturnType<typeof getQuarantinedRoutes>;
  mitigatedFeatures: string[];
  recentRecoveryEvents: ReturnType<typeof getRecoveryEvents>;
  recentCrashes: Array<{
    errorId: string;
    readableFingerprint: string;
    component?: string;
    route?: string;
    timestamp: string;
  }>;
};

export function getSelfHealingDashboardSnapshot(): SelfHealingDashboardSnapshot {
  const fingerprintCounts = getFingerprintCounts();
  const topFingerprints = Object.entries(fingerprintCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([fingerprint, count]) => ({ fingerprint, count }));

  let recentCrashes: SelfHealingDashboardSnapshot["recentCrashes"] = [];
  try {
    const w = window as Window & {
      __amynestCrashIntelligence?: Array<{
        errorId: string;
        readableFingerprint: string;
        component?: string;
        route?: string;
        timestamp: string;
      }>;
    };
    recentCrashes = (w.__amynestCrashIntelligence ?? []).slice(-20).map((c) => ({
      errorId: c.errorId,
      readableFingerprint: c.readableFingerprint,
      component: c.component,
      route: c.route,
      timestamp: c.timestamp,
    }));
  } catch {
    /* ignore */
  }

  return {
    generatedAt: new Date().toISOString(),
    topFingerprints,
    recoveryStats: getRecoveryStats(),
    quarantinedRoutes: getQuarantinedRoutes(),
    mitigatedFeatures: getMitigatedFeatures(),
    recentRecoveryEvents: getRecoveryEvents().slice(-30),
    recentCrashes,
  };
}
