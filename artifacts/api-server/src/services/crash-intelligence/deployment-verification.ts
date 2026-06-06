import { crashFingerprintStatusTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { aggregateCrashFingerprints } from "./aggregation-service.js";
import { ROOT_CAUSE_PLAYBOOKS } from "./root-cause-playbooks.js";
import type { DeploymentVerification } from "./types.js";

const REOPEN_THRESHOLD_RATIO = 0.5;

function relatedFingerprints(readableFingerprint: string): string[] {
  const playbook = ROOT_CAUSE_PLAYBOOKS.find(
    (p) => p.readableFingerprint === readableFingerprint,
  );
  if (!playbook) return [];
  return ROOT_CAUSE_PLAYBOOKS.filter(
    (p) => p.component === playbook.component,
  ).map((p) => p.readableFingerprint);
}

export async function markFingerprintFixed(input: {
  readableFingerprint: string;
  deployVersion: string;
}): Promise<void> {
  const aggregates = await aggregateCrashFingerprints(100);
  const agg = aggregates.find(
    (a) => a.readableFingerprint === input.readableFingerprint,
  );

  const existing = await db
    .select()
    .from(crashFingerprintStatusTable)
    .where(
      eq(
        crashFingerprintStatusTable.readableFingerprint,
        input.readableFingerprint,
      ),
    )
    .limit(1);

  const values = {
    triageStatus: "fixed",
    markedFixedAt: new Date(),
    markedFixedDeploy: input.deployVersion,
    baselineCount7d: agg?.count7d ?? 0,
    lastVerifiedAt: new Date(),
    verification: {
      recoveryRateAtMark: agg?.recoverySuccessRate ?? 100,
    },
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db
      .update(crashFingerprintStatusTable)
      .set(values)
      .where(
        eq(
          crashFingerprintStatusTable.readableFingerprint,
          input.readableFingerprint,
        ),
      );
  } else {
    await db.insert(crashFingerprintStatusTable).values({
      readableFingerprint: input.readableFingerprint,
      ...values,
    });
  }
}

export async function verifyFingerprintFix(
  readableFingerprint: string,
): Promise<DeploymentVerification> {
  const [status] = await db
    .select()
    .from(crashFingerprintStatusTable)
    .where(
      eq(crashFingerprintStatusTable.readableFingerprint, readableFingerprint),
    )
    .limit(1);

  const aggregates = await aggregateCrashFingerprints(100);
  const current = aggregates.find(
    (a) => a.readableFingerprint === readableFingerprint,
  );

  if (!status || status.triageStatus !== "fixed") {
    return {
      readableFingerprint,
      status: "pending_data",
      baselineCount7d: status?.baselineCount7d ?? 0,
      currentCount7d: current?.count7d ?? 0,
      recoveryRateBefore:
        (status?.verification as { recoveryRateAtMark?: number })
          ?.recoveryRateAtMark ?? 0,
      recoveryRateAfter: current?.recoverySuccessRate ?? 100,
      relatedFingerprints: relatedFingerprints(readableFingerprint),
      reason: "Fingerprint not marked fixed — nothing to verify",
    };
  }

  const baseline = status.baselineCount7d ?? 0;
  const currentCount = current?.count7d ?? 0;
  const recoveryBefore =
    (status.verification as { recoveryRateAtMark?: number })
      ?.recoveryRateAtMark ?? 0;
  const recoveryAfter = current?.recoverySuccessRate ?? 100;

  const related = relatedFingerprints(readableFingerprint);
  const relatedActive = aggregates.filter(
    (a) => related.includes(a.readableFingerprint) && a.count7d > 0,
  );

  let verifyStatus: DeploymentVerification["status"] = "verified_fixed";
  let reason = "Crash frequency decreased and recovery stable";

  if (
    currentCount >= baseline * REOPEN_THRESHOLD_RATIO &&
    baseline > 0
  ) {
    verifyStatus = "reopened";
    reason = `7d count ${currentCount} still >= 50% of baseline ${baseline}`;
    await db
      .update(crashFingerprintStatusTable)
      .set({
        triageStatus: "reopened",
        lastVerifiedAt: new Date(),
        verification: {
          ...((status.verification as Record<string, unknown>) ?? {}),
          reopenedAt: new Date().toISOString(),
          currentCount7d: currentCount,
        },
        updatedAt: new Date(),
      })
      .where(
        eq(
          crashFingerprintStatusTable.readableFingerprint,
          readableFingerprint,
        ),
      );
  } else if (recoveryAfter < recoveryBefore - 10) {
    verifyStatus = "reopened";
    reason = `Recovery rate dropped ${recoveryBefore}% → ${recoveryAfter}%`;
    await db
      .update(crashFingerprintStatusTable)
      .set({ triageStatus: "reopened", updatedAt: new Date() })
      .where(
        eq(
          crashFingerprintStatusTable.readableFingerprint,
          readableFingerprint,
        ),
      );
  } else if (relatedActive.some((a) => a.readableFingerprint !== readableFingerprint)) {
    verifyStatus = "reopened";
    reason = `Related fingerprint still active: ${relatedActive.map((a) => a.readableFingerprint).join(", ")}`;
  }

  return {
    readableFingerprint,
    status: verifyStatus,
    baselineCount7d: baseline,
    currentCount7d: currentCount,
    recoveryRateBefore: recoveryBefore,
    recoveryRateAfter: recoveryAfter,
    relatedFingerprints: related,
    reason,
  };
}
