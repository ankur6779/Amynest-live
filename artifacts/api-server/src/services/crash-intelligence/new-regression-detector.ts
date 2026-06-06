import {
  crashDeployBaselinesTable,
  crashEventsTable,
  crashFingerprintStatusTable,
  db,
} from "@workspace/db";
import { desc, eq, gte, sql } from "drizzle-orm";
import { aggregateCrashFingerprints } from "./aggregation-service.js";
import { CRASH_REGRESSION_REGISTRY } from "./regression-registry.js";
import type { CrashSeverity, NewRegressionFinding } from "./types.js";

export async function captureDeployBaseline(input: {
  appVersion: string;
  deployId?: string;
}): Promise<Record<string, number>> {
  const aggregates = await aggregateCrashFingerprints(100);
  const fingerprintCounts: Record<string, number> = {};
  for (const agg of aggregates) {
    fingerprintCounts[agg.readableFingerprint] = agg.count7d;
  }

  await db.insert(crashDeployBaselinesTable).values({
    appVersion: input.appVersion,
    deployId: input.deployId ?? null,
    fingerprintCounts,
  });

  return fingerprintCounts;
}

async function upsertFingerprintStatus(
  readableFingerprint: string,
  triageStatus: string,
): Promise<void> {
  const existing = await db
    .select({ id: crashFingerprintStatusTable.id })
    .from(crashFingerprintStatusTable)
    .where(
      eq(crashFingerprintStatusTable.readableFingerprint, readableFingerprint),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(crashFingerprintStatusTable)
      .set({ triageStatus, updatedAt: new Date() })
      .where(
        eq(
          crashFingerprintStatusTable.readableFingerprint,
          readableFingerprint,
        ),
      );
  } else {
    await db.insert(crashFingerprintStatusTable).values({
      readableFingerprint,
      triageStatus,
    });
  }
}

export async function detectNewRegressions(input?: {
  appVersion?: string;
  knownFingerprints?: string[];
}): Promise<NewRegressionFinding[]> {
  const known = new Set([
    ...CRASH_REGRESSION_REGISTRY.map((r) => r.readableFingerprint),
    ...(input?.knownFingerprints ?? []),
  ]);

  const [latestBaseline] = await db
    .select()
    .from(crashDeployBaselinesTable)
    .orderBy(desc(crashDeployBaselinesTable.capturedAt))
    .limit(1);

  const baselineFps = new Set(
    latestBaseline
      ? Object.keys(latestBaseline.fingerprintCounts as Record<string, number>)
      : [...known],
  );

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const currentFps = await db
    .select({
      readableFingerprint: crashEventsTable.readableFingerprint,
      count: sql<number>`count(*)::int`,
    })
    .from(crashEventsTable)
    .where(gte(crashEventsTable.timestamp, since24h))
    .groupBy(crashEventsTable.readableFingerprint);

  const findings: NewRegressionFinding[] = [];

  for (const row of currentFps) {
    if (baselineFps.has(row.readableFingerprint)) continue;
    if (known.has(row.readableFingerprint) && !latestBaseline) continue;

    const severity: CrashSeverity = "P0";
    findings.push({
      readableFingerprint: row.readableFingerprint,
      severity,
      firstSeenInDeploy: input?.appVersion ?? "current",
      countSinceDeploy: Number(row.count),
      triageStatus: "new_regression",
    });

    await upsertFingerprintStatus(row.readableFingerprint, "new_regression");
  }

  return findings;
}
