import { crashEventsTable, db } from "@workspace/db";
import { and, gte, sql } from "drizzle-orm";
import {
  computeCrashSeverity,
  computeRecoverySuccessRate,
  isCoreFlowRoute,
} from "./severity.js";
import type { FingerprintAggregate } from "./types.js";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

type RawAggregateRow = {
  readable_fingerprint: string;
  fingerprint: string;
  count_24h: number;
  count_7d: number;
  affected_users: number;
  affected_children: number;
  routes: string[] | null;
  first_seen: Date;
  last_seen: Date;
  recovery_attempts: number;
  recovery_success: number;
  example_error_ids: string[] | null;
};

export async function aggregateCrashFingerprints(
  limit = 25,
): Promise<FingerprintAggregate[]> {
  const since24h = hoursAgo(24);
  const since7d = hoursAgo(24 * 7);

  const rows = await db
    .select({
      readable_fingerprint: crashEventsTable.readableFingerprint,
      fingerprint: sql<string>`min(${crashEventsTable.fingerprint})`,
      count_24h: sql<number>`count(*) filter (where ${crashEventsTable.timestamp} >= ${since24h})`,
      count_7d: sql<number>`count(*) filter (where ${crashEventsTable.timestamp} >= ${since7d})`,
      affected_users: sql<number>`count(distinct ${crashEventsTable.userId}) filter (where ${crashEventsTable.userId} is not null)`,
      affected_children: sql<number>`count(distinct ${crashEventsTable.childId}) filter (where ${crashEventsTable.childId} is not null)`,
      routes: sql<string[]>`array_agg(distinct ${crashEventsTable.route}) filter (where ${crashEventsTable.route} is not null)`,
      first_seen: sql<Date>`min(${crashEventsTable.timestamp})`,
      last_seen: sql<Date>`max(${crashEventsTable.timestamp})`,
      recovery_attempts: sql<number>`count(*) filter (where (${crashEventsTable.meta}->>'recoveryOutcome') is not null)`,
      recovery_success: sql<number>`count(*) filter (where (${crashEventsTable.meta}->>'recoveryOutcome') = 'auto_recovered')`,
      example_error_ids: sql<string[]>`(array_agg(${crashEventsTable.errorId} order by ${crashEventsTable.timestamp} desc))[1:3]`,
    })
    .from(crashEventsTable)
    .where(gte(crashEventsTable.timestamp, since7d))
    .groupBy(crashEventsTable.readableFingerprint)
    .orderBy(
      sql`count(distinct ${crashEventsTable.userId}) filter (where ${crashEventsTable.userId} is not null) desc`,
      sql`count(*) filter (where ${crashEventsTable.timestamp} >= ${since24h}) desc`,
    )
    .limit(limit);

  return (rows as RawAggregateRow[]).map((row) => {
    const affectedRoutes = (row.routes ?? []).filter(Boolean);
    const coreFlowAffected = affectedRoutes.some((r) => isCoreFlowRoute(r));
    const recoverySuccessRate = computeRecoverySuccessRate(
      Number(row.recovery_success ?? 0),
      Number(row.recovery_attempts ?? 0),
    );
    const count24h = Number(row.count_24h ?? 0);
    const count7d = Number(row.count_7d ?? 0);

    return {
      readableFingerprint: row.readable_fingerprint,
      fingerprint: row.fingerprint,
      count24h,
      count7d,
      affectedUsers: Number(row.affected_users ?? 0),
      affectedChildren: Number(row.affected_children ?? 0),
      affectedRoutes,
      firstSeen: row.first_seen.toISOString(),
      lastSeen: row.last_seen.toISOString(),
      recoverySuccessRate,
      severity: computeCrashSeverity({
        count24h,
        count7d,
        recoverySuccessRate,
        coreFlowAffected,
      }),
      exampleErrorIds: row.example_error_ids ?? [],
      coreFlowAffected,
    };
  });
}

export async function computeGlobalRecoveryRate(): Promise<number> {
  const since7d = hoursAgo(24 * 7);
  const [row] = await db
    .select({
      attempts: sql<number>`count(*) filter (where (${crashEventsTable.meta}->>'recoveryOutcome') is not null)`,
      success: sql<number>`count(*) filter (where (${crashEventsTable.meta}->>'recoveryOutcome') = 'auto_recovered')`,
    })
    .from(crashEventsTable)
    .where(
      and(
        gte(crashEventsTable.timestamp, since7d),
        sql`coalesce((${crashEventsTable.meta}->>'selfHealing')::boolean, false) = true`,
      ),
    );

  return computeRecoverySuccessRate(
    Number(row?.success ?? 0),
    Number(row?.attempts ?? 0),
  );
}
