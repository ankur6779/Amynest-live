import { and, desc, eq, gte } from "drizzle-orm";
import {
  db,
  childrenTable,
  childDailySignalsTable,
  familyDigitalTwinTable,
  familyGoalsTable,
  familyIntelligenceSnapshotsTable,
  familyMemoryTable,
  familyMomentsTable,
  notificationPreferencesTable,
} from "@workspace/db";
import {
  computeFamilyIntelligence,
  buildCommandCenter,
  type FamilyIntelligenceInput,
  type FamilyIntelligenceSnapshot,
  type FamilyGoal,
  type MemoryEntry,
  FAMILY_INTELLIGENCE_ENGINE_VERSION,
} from "@workspace/family-intelligence";
import { loadOutcomeSignals } from "./notificationOutcomeService.js";
import { getChildIntelligenceSnapshot } from "./childIntelligenceService.js";

function todayLocalDateString(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function loadHealthHistory(
  userId: string,
  days: number,
): Promise<number[]> {
  const cutoff = new Date(Date.now() - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const rows = await db
    .select({ score: familyIntelligenceSnapshotsTable.healthScore, date: familyIntelligenceSnapshotsTable.localDate })
    .from(familyIntelligenceSnapshotsTable)
    .where(
      and(
        eq(familyIntelligenceSnapshotsTable.userId, userId),
        gte(familyIntelligenceSnapshotsTable.localDate, cutoff),
      ),
    )
    .orderBy(familyIntelligenceSnapshotsTable.localDate);
  return rows.map((r) => r.score);
}

async function loadActiveGoals(userId: string): Promise<FamilyGoal[]> {
  const rows = await db
    .select()
    .from(familyGoalsTable)
    .where(and(eq(familyGoalsTable.userId, userId), eq(familyGoalsTable.active, 1)));
  return rows.map((r) => ({
    id: String(r.id),
    type: r.goalType as FamilyGoal["type"],
    target: r.target,
    progress: r.progress,
    targetValue: r.targetValue,
    unit: r.unit,
    active: r.active === 1,
  }));
}

async function loadRecentMemory(userId: string): Promise<MemoryEntry[]> {
  const rows = await db
    .select()
    .from(familyMemoryTable)
    .where(eq(familyMemoryTable.userId, userId))
    .orderBy(desc(familyMemoryTable.recordedAt))
    .limit(50);
  return rows.map((r) => ({
    id: String(r.id),
    category: r.category as MemoryEntry["category"],
    key: r.memoryKey,
    outcome: r.outcome as MemoryEntry["outcome"],
    context: r.context ?? "",
    recordedAt: r.recordedAt.toISOString(),
    confidenceScore: r.confidenceScore ?? undefined,
    sampleSize: r.sampleSize ?? undefined,
    validatedAt: r.validatedAt?.toISOString(),
  }));
}

/**
 * Assemble input from all existing subsystems and compute unified intelligence.
 */
export async function refreshFamilyIntelligence(
  userId: string,
  timezone?: string,
): Promise<FamilyIntelligenceSnapshot> {
  const [prefs] = await db
    .select({ timezone: notificationPreferencesTable.timezone })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  const tz = timezone ?? prefs?.timezone ?? "Asia/Kolkata";
  const localDate = todayLocalDateString(tz);

  const outcomeSignals = await loadOutcomeSignals(userId, tz);

  const [child] = await db
    .select({ id: childrenTable.id, name: childrenTable.name })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(desc(childrenTable.createdAt))
    .limit(1);

  let childSnapshot = null;
  let sleepQualityAvg7d: number | null = null;
  let screenMinutesAvg7d: number | null = null;
  let completionPctAvg7d: number | null = null;
  let parentGoals: string[] = [];

  if (child) {
    const [childRow] = await db
      .select({ parentGoals: childrenTable.parentGoals, energyProfile: childrenTable.energyProfile })
      .from(childrenTable)
      .where(eq(childrenTable.id, child.id))
      .limit(1);
    if (childRow) {
      childSnapshot = await getChildIntelligenceSnapshot(child.id, childRow);
      parentGoals = childSnapshot.parentGoals;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const signals = await db
      .select()
      .from(childDailySignalsTable)
      .where(
        and(
          eq(childDailySignalsTable.childId, child.id),
          gte(childDailySignalsTable.date, sevenDaysAgo),
        ),
      );
    sleepQualityAvg7d = avg(signals.map((s) => s.sleepQuality).filter((n): n is number => n != null));
    screenMinutesAvg7d = avg(signals.map((s) => s.screenMinutes).filter((n): n is number => n != null));
    completionPctAvg7d = avg(signals.map((s) => s.completionPct).filter((n): n is number => n != null));
  }

  const [healthHistory7d, healthHistory30d, activeGoals, recentMemory] = await Promise.all([
    loadHealthHistory(userId, 7),
    loadHealthHistory(userId, 30),
    loadActiveGoals(userId),
    loadRecentMemory(userId),
  ]);

  const input: FamilyIntelligenceInput = {
    userId,
    primaryChildId: child?.id ?? outcomeSignals?.childId ?? null,
    childName: child?.name ?? outcomeSignals?.childName ?? "your child",
    timezone: tz,
    localDate,
    isPremium: outcomeSignals?.isPremium ?? false,
    routineCompletionRate7d: outcomeSignals?.routineCompletionRate7d ?? 0,
    weeklyRoutineConsistency: outcomeSignals?.weeklyRoutineConsistency ?? 0,
    lessonsCompleted7d: outcomeSignals?.lessonsCompleted7d ?? 0,
    lessonsCompletedTotal: outcomeSignals?.lessonsCompletedTotal ?? 0,
    weakSubjects: outcomeSignals?.weakSubjects ?? [],
    strongSubjects: outcomeSignals?.strongSubjects ?? [],
    currentStreakDays: outcomeSignals?.currentStreakDays ?? 0,
    streakBrokenDaysAgo: outcomeSignals?.streakBrokenDaysAgo ?? null,
    daysSinceLastActive: outcomeSignals?.daysSinceLastActive ?? 0,
    notificationsOpened7d: outcomeSignals?.notificationsOpened7d ?? 0,
    sessionsLast7d: outcomeSignals?.sessionsLast7d ?? 0,
    accountAgeDays: outcomeSignals?.accountAgeDays ?? 0,
    churnRisk7d: outcomeSignals?.churnRisk7d ?? 0,
    churnRisk30d: outcomeSignals?.churnRisk30d ?? 0,
    sleepQualityAvg7d,
    screenMinutesAvg7d,
    completionPctAvg7d,
    parentGoals,
    trustScore: null,
    dropOffRisk: null,
    healthHistory7d,
    healthHistory30d,
    activeGoals,
    recentMemory,
  };

  const snapshot = computeFamilyIntelligence(input);
  await persistSnapshot(snapshot, localDate);
  await persistDigitalTwin(snapshot);
  await persistNewMoments(snapshot);

  return snapshot;
}

async function persistSnapshot(
  snapshot: FamilyIntelligenceSnapshot,
  localDate: string,
): Promise<void> {
  await db
    .insert(familyIntelligenceSnapshotsTable)
    .values({
      userId: snapshot.userId,
      primaryChildId: snapshot.primaryChildId,
      localDate,
      healthScore: snapshot.health.score,
      healthComponents: snapshot.health.components,
      trend7d: snapshot.health.trend7d,
      trend30d: snapshot.health.trend30d,
      riskSnapshot: snapshot.risks,
      successMetrics: snapshot.successMetrics,
      topActionCategory: snapshot.topAction?.category ?? null,
      engineVersion: FAMILY_INTELLIGENCE_ENGINE_VERSION,
    })
    .onConflictDoUpdate({
      target: [familyIntelligenceSnapshotsTable.userId, familyIntelligenceSnapshotsTable.localDate],
      set: {
        healthScore: snapshot.health.score,
        healthComponents: snapshot.health.components,
        trend7d: snapshot.health.trend7d,
        trend30d: snapshot.health.trend30d,
        riskSnapshot: snapshot.risks,
        successMetrics: snapshot.successMetrics,
        topActionCategory: snapshot.topAction?.category ?? null,
        engineVersion: FAMILY_INTELLIGENCE_ENGINE_VERSION,
      },
    });
}

async function persistDigitalTwin(snapshot: FamilyIntelligenceSnapshot): Promise<void> {
  await db
    .insert(familyDigitalTwinTable)
    .values({
      userId: snapshot.userId,
      primaryChildId: snapshot.primaryChildId,
      profile: snapshot.digitalTwin,
    })
    .onConflictDoUpdate({
      target: familyDigitalTwinTable.userId,
      set: {
        primaryChildId: snapshot.primaryChildId,
        profile: snapshot.digitalTwin,
        updatedAt: new Date(),
      },
    });
}

async function persistNewMoments(snapshot: FamilyIntelligenceSnapshot): Promise<void> {
  for (const m of snapshot.moments) {
    const existing = await db
      .select({ id: familyMomentsTable.id })
      .from(familyMomentsTable)
      .where(
        and(
          eq(familyMomentsTable.userId, snapshot.userId),
          eq(familyMomentsTable.momentType, m.type),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(familyMomentsTable).values({
      userId: snapshot.userId,
      childId: m.childId,
      momentType: m.type,
      title: m.title,
      description: m.description,
      coordinatedActions: m.coordinatedActions,
    });
  }
}

export async function getFamilyCommandCenter(userId: string): Promise<ReturnType<typeof buildCommandCenter>> {
  const snapshot = await refreshFamilyIntelligence(userId);
  return buildCommandCenter(snapshot);
}

export async function recordFamilyMemory(
  userId: string,
  entry: {
    category: string;
    key: string;
    outcome: string;
    context?: string;
    confidenceScore?: number;
    sampleSize?: number;
    validatedAt?: string;
  },
): Promise<void> {
  await db.insert(familyMemoryTable).values({
    userId,
    category: entry.category,
    memoryKey: entry.key,
    outcome: entry.outcome,
    context: entry.context ?? null,
    confidenceScore: entry.confidenceScore ?? null,
    sampleSize: entry.sampleSize ?? null,
    validatedAt: entry.validatedAt ? new Date(entry.validatedAt) : null,
  });
}

export async function upsertFamilyGoal(
  userId: string,
  goal: {
    childId?: number;
    goalType: string;
    target: string;
    targetValue?: number;
    unit?: string;
  },
): Promise<void> {
  await db.insert(familyGoalsTable).values({
    userId,
    childId: goal.childId ?? null,
    goalType: goal.goalType,
    target: goal.target,
    targetValue: goal.targetValue ?? 3,
    unit: goal.unit ?? "sessions",
    progress: 0,
    active: 1,
  });
}
