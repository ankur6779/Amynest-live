import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  familyMemoryTable,
  familyStrategyProfileTable,
  interventionLedgerTable,
  notificationPreferencesTable,
  parentProfilesTable,
} from "@workspace/db";
import type { OutcomeSignals } from "@workspace/notification-engine";
import {
  answerAmyEvidenceQuestion,
  buildRealityDashboard,
  buildStrategyProfile,
  recordRecommendationAction,
  recordRecommendationDispatched,
  toValidatedMemoryUpdate,
  validateIntervention,
  type AmyEvidenceAnswer,
  type FamilyStrategyProfile,
  type InterventionLedgerEntry,
  type InterventionSurface,
  type RealityDashboardView,
} from "@workspace/reality-validation";
import { loadOutcomeSignals } from "./notificationOutcomeService.js";
import { logger } from "../lib/logger.js";

const VALIDATION_DELAY_DAYS = 7;

function newLedgerId(): string {
  return `rv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function rowToEntry(row: typeof interventionLedgerTable.$inferSelect): InterventionLedgerEntry {
  return {
    ledgerId: row.ledgerId,
    userId: row.userId,
    childId: row.childId,
    interventionId: row.interventionId,
    interventionType: row.interventionType,
    surface: row.surface as InterventionSurface,
    recommendationTitle: row.recommendationTitle,
    recommendationKey: row.recommendationKey,
    dispatchedAt: row.dispatchedAt.toISOString(),
    actionAt: row.actionAt?.toISOString() ?? null,
    validatedAt: row.validatedAt?.toISOString() ?? null,
    scorecard: row.scorecard as InterventionLedgerEntry["scorecard"],
    confidenceScore: row.confidenceScore,
    baselineMetrics: row.baselineMetrics as InterventionLedgerEntry["baselineMetrics"],
    followUpMetrics: (row.followUpMetrics as InterventionLedgerEntry["followUpMetrics"]) ?? null,
    metricDeltas: (row.metricDeltas as InterventionLedgerEntry["metricDeltas"]) ?? null,
    experimentId: row.experimentId,
    experimentVariant: row.experimentVariant,
    halfLifeDays: row.halfLifeDays,
    evidenceSummary: row.evidenceSummary,
  };
}

function signalsToBaseline(signals: OutcomeSignals, healthScore?: number) {
  return {
    routineCompletionRate7d: signals.routineCompletionRate7d,
    lessonsCompleted7d: signals.lessonsCompleted7d,
    currentStreakDays: signals.currentStreakDays,
    sessionsLast7d: signals.sessionsLast7d,
    healthScore: healthScore ?? 0,
  };
}

async function loadTimezone(userId: string): Promise<string> {
  const [prefs] = await db
    .select({ timezone: notificationPreferencesTable.timezone })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  return prefs?.timezone ?? "Asia/Kolkata";
}

async function loadHealthScore(userId: string): Promise<number> {
  const { familyIntelligenceSnapshotsTable } = await import("@workspace/db");
  const [row] = await db
    .select({ score: familyIntelligenceSnapshotsTable.healthScore })
    .from(familyIntelligenceSnapshotsTable)
    .where(eq(familyIntelligenceSnapshotsTable.userId, userId))
    .orderBy(desc(familyIntelligenceSnapshotsTable.localDate))
    .limit(1);
  return row?.score ?? 0;
}

async function loadLedger(userId: string, limit = 100): Promise<InterventionLedgerEntry[]> {
  const rows = await db
    .select()
    .from(interventionLedgerTable)
    .where(eq(interventionLedgerTable.userId, userId))
    .orderBy(desc(interventionLedgerTable.dispatchedAt))
    .limit(limit);
  return rows.map(rowToEntry);
}

async function persistLedgerEntry(entry: InterventionLedgerEntry): Promise<void> {
  const existing = await db
    .select({ id: interventionLedgerTable.id })
    .from(interventionLedgerTable)
    .where(eq(interventionLedgerTable.ledgerId, entry.ledgerId))
    .limit(1);

  const values = {
    userId: entry.userId,
    childId: entry.childId,
    interventionId: entry.interventionId,
    interventionType: entry.interventionType,
    surface: entry.surface,
    recommendationTitle: entry.recommendationTitle,
    recommendationKey: entry.recommendationKey,
    dispatchedAt: new Date(entry.dispatchedAt),
    actionAt: entry.actionAt ? new Date(entry.actionAt) : null,
    validatedAt: entry.validatedAt ? new Date(entry.validatedAt) : null,
    scorecard: entry.scorecard,
    confidenceScore: entry.confidenceScore,
    baselineMetrics: entry.baselineMetrics,
    followUpMetrics: entry.followUpMetrics,
    metricDeltas: entry.metricDeltas,
    experimentId: entry.experimentId,
    experimentVariant: entry.experimentVariant,
    halfLifeDays: entry.halfLifeDays,
    evidenceSummary: entry.evidenceSummary,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db
      .update(interventionLedgerTable)
      .set(values)
      .where(eq(interventionLedgerTable.ledgerId, entry.ledgerId));
  } else {
    await db.insert(interventionLedgerTable).values({
      ledgerId: entry.ledgerId,
      ...values,
    });
  }
}

async function writeValidatedMemory(
  userId: string,
  entry: InterventionLedgerEntry,
): Promise<void> {
  const priorCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interventionLedgerTable)
    .where(
      and(
        eq(interventionLedgerTable.userId, userId),
        eq(interventionLedgerTable.recommendationKey, entry.recommendationKey),
        eq(interventionLedgerTable.scorecard, entry.scorecard),
      ),
    )
    .then((r) => r[0]?.count ?? 1);

  const update = toValidatedMemoryUpdate(entry, priorCount);
  if (!update) return;

  await db.insert(familyMemoryTable).values({
    userId,
    category: update.category,
    memoryKey: update.key,
    outcome: update.outcome,
    context: update.context,
    confidenceScore: update.confidenceScore,
    sampleSize: update.sampleSize,
    validatedAt: new Date(update.validatedAt),
  });
}

async function refreshStrategyProfile(userId: string): Promise<FamilyStrategyProfile> {
  const ledger = await loadLedger(userId, 200);
  const tz = await loadTimezone(userId);
  const signals = await loadOutcomeSignals(userId, tz);
  const [profile] = await db
    .select({ createdAt: parentProfilesTable.createdAt })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);
  const childCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .then((r) => r[0]?.count ?? 1);

  const accountAgeDays = profile?.createdAt
    ? Math.floor((Date.now() - profile.createdAt.getTime()) / 86400000)
    : 30;

  const profileView = buildStrategyProfile(userId, ledger, {
    routineCompletionRate7d: Math.round((signals?.routineCompletionRate7d ?? 0) * 100),
    learningSuccess7d: Math.min(100, (signals?.lessonsCompleted7d ?? 0) * 15),
    accountAgeDays,
    childCount,
  });

  await db
    .insert(familyStrategyProfileTable)
    .values({ userId, profile: profileView, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: familyStrategyProfileTable.userId,
      set: { profile: profileView, updatedAt: new Date() },
    });

  return profileView;
}

async function loadStrategyProfile(userId: string): Promise<FamilyStrategyProfile | null> {
  const [row] = await db
    .select()
    .from(familyStrategyProfileTable)
    .where(eq(familyStrategyProfileTable.userId, userId))
    .limit(1);
  return (row?.profile as FamilyStrategyProfile) ?? null;
}

/** Validate pending interventions older than VALIDATION_DELAY_DAYS. */
export async function validatePendingInterventions(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - VALIDATION_DELAY_DAYS * 86400000);
  const pending = await db
    .select()
    .from(interventionLedgerTable)
    .where(
      and(
        eq(interventionLedgerTable.userId, userId),
        eq(interventionLedgerTable.scorecard, "pending_validation"),
        lte(interventionLedgerTable.dispatchedAt, cutoff),
      ),
    )
    .limit(20);

  if (pending.length === 0) return 0;

  const tz = await loadTimezone(userId);
  const followUpSignals = await loadOutcomeSignals(userId, tz);
  const healthScore = await loadHealthScore(userId);
  if (!followUpSignals) return 0;

  let validated = 0;
  for (const row of pending) {
    const baseline = row.baselineMetrics as ReturnType<typeof signalsToBaseline>;
    const entry = validateIntervention({
      ledgerId: row.ledgerId,
      userId: row.userId,
      childId: row.childId,
      interventionId: row.interventionId,
      interventionType: row.interventionType,
      surface: row.surface as InterventionSurface,
      recommendationTitle: row.recommendationTitle,
      recommendationKey: row.recommendationKey,
      dispatchedAt: row.dispatchedAt.toISOString(),
      actionAt: row.actionAt?.toISOString() ?? null,
      baselineSignals: baseline,
      followUpSignals: signalsToBaseline(followUpSignals, healthScore),
      experimentId: row.experimentId,
      experimentVariant: row.experimentVariant,
    });
    await persistLedgerEntry(entry);
    await writeValidatedMemory(userId, entry);
    validated++;
  }

  if (validated > 0) {
    await refreshStrategyProfile(userId);
  }
  return validated;
}

export async function recordInterventionDispatched(
  userId: string,
  params: {
    childId?: number | null;
    interventionId: string;
    interventionType: string;
    surface: InterventionSurface;
    recommendationTitle: string;
    recommendationKey: string;
    experimentId?: string | null;
    experimentVariant?: string | null;
  },
): Promise<InterventionLedgerEntry> {
  const tz = await loadTimezone(userId);
  const signals = await loadOutcomeSignals(userId, tz);
  const healthScore = await loadHealthScore(userId);

  const entry = recordRecommendationDispatched({
    ledgerId: newLedgerId(),
    userId,
    childId: params.childId ?? signals?.childId ?? null,
    interventionId: params.interventionId,
    interventionType: params.interventionType,
    surface: params.surface,
    recommendationTitle: params.recommendationTitle,
    recommendationKey: params.recommendationKey,
    dispatchedAt: new Date().toISOString(),
    actionAt: null,
    baselineSignals: signalsToBaseline(signals ?? { routineCompletionRate7d: 0, lessonsCompleted7d: 0, currentStreakDays: 0, sessionsLast7d: 0 } as OutcomeSignals, healthScore),
    experimentId: params.experimentId,
    experimentVariant: params.experimentVariant,
  });

  await persistLedgerEntry(entry);
  logger.info({ userId, key: params.recommendationKey }, "Intervention dispatched to reality ledger");
  return entry;
}

export async function recordInterventionAction(
  userId: string,
  ledgerId: string,
): Promise<InterventionLedgerEntry | null> {
  const [row] = await db
    .select()
    .from(interventionLedgerTable)
    .where(
      and(
        eq(interventionLedgerTable.userId, userId),
        eq(interventionLedgerTable.ledgerId, ledgerId),
      ),
    )
    .limit(1);
  if (!row) return null;

  const entry = recordRecommendationAction(rowToEntry(row), new Date().toISOString());
  await persistLedgerEntry(entry);
  return entry;
}

export async function recordInterventionActionByKey(
  userId: string,
  recommendationKey: string,
): Promise<void> {
  const [row] = await db
    .select()
    .from(interventionLedgerTable)
    .where(
      and(
        eq(interventionLedgerTable.userId, userId),
        eq(interventionLedgerTable.recommendationKey, recommendationKey),
        isNull(interventionLedgerTable.actionAt),
      ),
    )
    .orderBy(desc(interventionLedgerTable.dispatchedAt))
    .limit(1);
  if (!row) return;
  await recordInterventionAction(userId, row.ledgerId);
}

export async function getRealityDashboard(userId: string): Promise<{
  dashboard: RealityDashboardView;
  strategyProfile: FamilyStrategyProfile | null;
}> {
  await validatePendingInterventions(userId);
  const ledger = await loadLedger(userId);
  let profile = await loadStrategyProfile(userId);
  if (!profile && ledger.length > 0) {
    profile = await refreshStrategyProfile(userId);
  }
  return {
    dashboard: buildRealityDashboard(ledger, profile),
    strategyProfile: profile,
  };
}

export async function getAmyEvidenceAnswer(
  userId: string,
  question: string,
): Promise<AmyEvidenceAnswer> {
  const ledger = await loadLedger(userId);
  return answerAmyEvidenceQuestion(question, ledger);
}

export async function getStrategyProfile(userId: string): Promise<FamilyStrategyProfile> {
  const existing = await loadStrategyProfile(userId);
  if (existing) return existing;
  return refreshStrategyProfile(userId);
}

export async function shouldSuppressInterventionKey(
  userId: string,
  key: string,
): Promise<boolean> {
  const profile = await loadStrategyProfile(userId);
  if (!profile) return false;
  const rule = profile.selfCorrectionRules.find((r) => r.interventionKey === key);
  if (!rule?.suppressUntil) return false;
  return new Date(rule.suppressUntil).getTime() > Date.now();
}

/** Bridge from notification outcome events into reality validation ledger. */
export async function bridgeNotificationOutcome(
  userId: string,
  outcomeEvent: string,
  notificationLogId: number | null,
): Promise<void> {
  const key = `notification_${outcomeEvent}`;
  await recordInterventionDispatched(userId, {
    interventionId: notificationLogId ? String(notificationLogId) : key,
    interventionType: outcomeEvent,
    surface: "notification",
    recommendationTitle: `Notification: ${outcomeEvent.replace(/_/g, " ")}`,
    recommendationKey: key,
  });
  await recordInterventionActionByKey(userId, key);
}

export async function getRealityValidationAnalytics(
  userId: string,
  windowDays = 30,
): Promise<{
  chainEvents: Array<{
    recommendationId: string;
    recommendationTitle: string;
    actionAt: string | null;
    outcomeAt: string | null;
    validatedAt: string | null;
    scorecard: string;
  }>;
  scorecardBreakdown: Record<string, number>;
}> {
  const cutoff = new Date(Date.now() - windowDays * 86400000);
  const rows = await db
    .select()
    .from(interventionLedgerTable)
    .where(
      and(
        eq(interventionLedgerTable.userId, userId),
        gte(interventionLedgerTable.dispatchedAt, cutoff),
      ),
    )
    .orderBy(desc(interventionLedgerTable.dispatchedAt));

  const scorecardBreakdown: Record<string, number> = {};
  for (const r of rows) {
    scorecardBreakdown[r.scorecard] = (scorecardBreakdown[r.scorecard] ?? 0) + 1;
  }

  return {
    chainEvents: rows.map((r) => ({
      recommendationId: r.ledgerId,
      recommendationTitle: r.recommendationTitle,
      actionAt: r.actionAt?.toISOString() ?? null,
      outcomeAt: r.validatedAt?.toISOString() ?? null,
      validatedAt: r.validatedAt?.toISOString() ?? null,
      scorecard: r.scorecard,
    })),
    scorecardBreakdown,
  };
}
