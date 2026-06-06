import type { FingerprintAggregate, LaunchGateResult } from "./types.js";
import { getRootCauseForFingerprint } from "./root-cause-playbooks.js";
import {
  getRegressionForFingerprint,
  verifyRegressionTestFiles,
} from "./regression-registry.js";

const MIN_GLOBAL_RECOVERY_RATE = 90;

export function evaluateLaunchGate(input: {
  aggregates: FingerprintAggregate[];
  globalRecoveryRate: number;
  newFingerprintsWithoutCoverage?: string[];
}): LaunchGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.globalRecoveryRate < MIN_GLOBAL_RECOVERY_RATE) {
    blockers.push(
      `Global recovery rate ${input.globalRecoveryRate}% is below ${MIN_GLOBAL_RECOVERY_RATE}% threshold`,
    );
  }

  for (const agg of input.aggregates) {
    if (agg.severity !== "P0" || agg.count24h === 0) continue;

    const rootCause = getRootCauseForFingerprint(agg.readableFingerprint);
    const regression = getRegressionForFingerprint(agg.readableFingerprint);

    if (!rootCause) {
      blockers.push(
        `P0 fingerprint ${agg.readableFingerprint} has no root cause playbook (${agg.count24h}/24h, ${agg.affectedUsers} users)`,
      );
    }

    if (!regression || regression.status !== "covered") {
      blockers.push(
        `P0 fingerprint ${agg.readableFingerprint} lacks regression coverage (status: ${regression?.status ?? "none"})`,
      );
    } else {
      const verified = verifyRegressionTestFiles(regression);
      if (!verified.ok) {
        blockers.push(
          `P0 fingerprint ${agg.readableFingerprint} regression tests missing: ${verified.missing.join(", ")}`,
        );
      }
    }

    if (agg.recoverySuccessRate < 70) {
      blockers.push(
        `P0 fingerprint ${agg.readableFingerprint} recovery rate ${agg.recoverySuccessRate}% < 70%`,
      );
    }
  }

  for (const fp of input.newFingerprintsWithoutCoverage ?? []) {
    const regression = getRegressionForFingerprint(fp);
    if (!regression || regression.status !== "covered") {
      blockers.push(
        `New fingerprint ${fp} introduced without regression coverage`,
      );
    }
  }

  for (const agg of input.aggregates) {
    if (agg.severity === "P1" && !getRootCauseForFingerprint(agg.readableFingerprint)) {
      warnings.push(
        `P1 fingerprint ${agg.readableFingerprint} has no root cause playbook`,
      );
    }
  }

  return {
    pass: blockers.length === 0,
    blockers,
    warnings,
  };
}
