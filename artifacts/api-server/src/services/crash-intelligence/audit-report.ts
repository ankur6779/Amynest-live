import { aggregateCrashFingerprints, computeGlobalRecoveryRate } from "./aggregation-service.js";
import { getFixSuggestionForFingerprint } from "./fix-suggestions.js";
import { evaluateLaunchGate } from "./launch-gate.js";
import { getRegressionForFingerprint } from "./regression-registry.js";
import { getRootCauseForFingerprint } from "./root-cause-playbooks.js";
import type { EngineeringAuditReport } from "./types.js";

export async function generateEngineeringAuditReport(
  limit = 15,
): Promise<EngineeringAuditReport> {
  const aggregates = await aggregateCrashFingerprints(limit);
  const globalRecoveryRate = await computeGlobalRecoveryRate();

  const sorted = [...aggregates].sort((a, b) => {
    const severityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const sev = severityOrder[a.severity] - severityOrder[b.severity];
    if (sev !== 0) return sev;
    if (b.affectedUsers !== a.affectedUsers) return b.affectedUsers - a.affectedUsers;
    return b.count24h - a.count24h;
  });

  const entries = sorted.map((aggregate) => ({
    aggregate,
    rootCause: getRootCauseForFingerprint(aggregate.readableFingerprint),
    fixSuggestion: getFixSuggestionForFingerprint(aggregate.readableFingerprint),
    regression: getRegressionForFingerprint(aggregate.readableFingerprint),
  }));

  const launchGate = evaluateLaunchGate({
    aggregates: sorted,
    globalRecoveryRate,
  });

  return {
    generatedAt: new Date().toISOString(),
    topFingerprints: sorted,
    entries,
    globalRecoveryRate,
    launchGate,
  };
}
