import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  db,
  userIntentsTable,
  userIntentEventsTable,
  routinesTable,
  familyGoalsTable,
  learningProgressTable,
  childrenTable,
} from "@workspace/db";
import {
  assertIntentTransition,
  analyticsEventForTransition,
  buildContinueJourneyView,
  computeIntentRoi,
  deriveIntentsFromContext,
  intentFromAction,
  newIntentId,
  transitionOnInterruption,
  INTENT_RECOVERY_ENGINE_VERSION,
  type CreateIntentInput,
  type IntentAnalyticsEvent,
  type IntentState,
  type IntentSyncContext,
  type UserIntent,
} from "@workspace/intent-recovery";
import { loadCampaignProgress } from "./notificationOutcomeService.js";
import { recordFamilyMemory } from "./unifiedFamilyIntelligenceService.js";

const ACTIVE_STATES = ["pending", "started", "in_progress"] as const;

function rowToIntent(row: typeof userIntentsTable.$inferSelect): UserIntent {
  return {
    intentId: row.intentId,
    userId: row.userId,
    childId: row.childId,
    intentType: row.intentType as UserIntent["intentType"],
    intentSource: row.intentSource as UserIntent["intentSource"],
    intentPriority: row.intentPriority,
    state: row.state as IntentState,
    title: row.title,
    subtitle: row.subtitle,
    amyContinuationLine: row.amyContinuationLine,
    actionTarget: row.actionTarget as UserIntent["actionTarget"],
    entityId: row.entityId,
    href: row.href,
    progressPct: row.progressPct,
    progressJson: (row.progressJson ?? {}) as Record<string, unknown>,
    deviceId: row.deviceId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    interruptedAt: row.interruptedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
  };
}

async function logIntentEvent(
  userId: string,
  intentId: string,
  event: IntentAnalyticsEvent,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(userIntentEventsTable).values({
    userId,
    intentId,
    event,
    metadata: metadata ?? {},
  });
}

async function loadSyncContext(userId: string): Promise<IntentSyncContext | null> {
  const [child] = await db
    .select({ id: childrenTable.id, name: childrenTable.name })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(desc(childrenTable.id))
    .limit(1);
  if (!child) return null;

  const campaign = await loadCampaignProgress(userId);

  const [learning] = await db
    .select({ dailySession: learningProgressTable.dailySession })
    .from(learningProgressTable)
    .where(eq(learningProgressTable.childId, child.id))
    .limit(1);

  const dailySession = learning?.dailySession as {
    sessionId?: string;
    steps?: Array<{ completed?: boolean }>;
    lastActivityId?: string;
  } | null;

  let learningSession: IntentSyncContext["learningSession"] = null;
  if (dailySession?.steps?.length) {
    const completed = dailySession.steps.filter((s) => s.completed).length;
    if (completed < dailySession.steps.length) {
      learningSession = {
        sessionId: dailySession.sessionId ?? "daily",
        stepsCompleted: completed,
        stepsTotal: dailySession.steps.length,
        lastActivityId: dailySession.lastActivityId ?? null,
      };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const [routine] = await db
    .select()
    .from(routinesTable)
    .where(and(eq(routinesTable.childId, child.id), eq(routinesTable.date, today)))
    .orderBy(desc(routinesTable.id))
    .limit(1);

  let routineTask: IntentSyncContext["routineTask"] = null;
  if (routine?.items) {
    const items = routine.items as Array<{ title?: string; status?: string }>;
    const pendingIdx = items.findIndex((i) => i.status === "pending" || i.status === "delayed");
    const completedCount = items.filter((i) => i.status === "completed").length;
    if (pendingIdx >= 0) {
      routineTask = {
        routineId: routine.id,
        routineTitle: routine.title ?? "Today's routine",
        itemIndex: pendingIdx,
        itemTitle: items[pendingIdx]?.title ?? "Next task",
        completedCount,
        totalCount: items.length,
      };
    }
  }

  const [goal] = await db
    .select()
    .from(familyGoalsTable)
    .where(and(eq(familyGoalsTable.userId, userId), eq(familyGoalsTable.active, 1)))
    .orderBy(desc(familyGoalsTable.updatedAt))
    .limit(1);

  return {
    userId,
    childId: child.id,
    childName: child.name ?? "your child",
    campaign: campaign
      ? {
          campaignId: campaign.campaignId,
          currentStep: campaign.currentStep,
          stepCompletedAt: campaign.stepCompletedAt as Record<string, string>,
          startedAt: campaign.startedAt,
        }
      : null,
    learningSession,
    routineTask,
    activeGoal: goal
      ? {
          goalId: String(goal.id),
          goalType: goal.goalType,
          progress: goal.progress,
          targetValue: goal.targetValue,
        }
      : null,
  };
}

async function upsertDerivedIntents(userId: string): Promise<void> {
  const ctx = await loadSyncContext(userId);
  if (!ctx) return;

  const derived = deriveIntentsFromContext(ctx);
  const now = new Date();

  for (const d of derived) {
    const ttlHours = d.ttlHours ?? 72;
    const expiresAt = new Date(now.getTime() + ttlHours * 3_600_000);
    const entityKey = d.entityId ?? d.intentType;

    const [existing] = await db
      .select()
      .from(userIntentsTable)
      .where(
        and(
          eq(userIntentsTable.userId, userId),
          eq(userIntentsTable.intentType, d.intentType),
          eq(userIntentsTable.entityId, entityKey),
          inArray(userIntentsTable.state, [...ACTIVE_STATES]),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(userIntentsTable)
        .set({
          title: d.title,
          subtitle: d.subtitle ?? "",
          amyContinuationLine: d.amyContinuationLine ?? "",
          href: d.href,
          progressPct: d.progressPct ?? 0,
          progressJson: d.progressJson ?? {},
          intentPriority: d.intentPriority ?? 50,
          updatedAt: now,
        })
        .where(eq(userIntentsTable.id, existing.id));
      continue;
    }

    const intentId = newIntentId();
    await db.insert(userIntentsTable).values({
      intentId,
      userId,
      childId: d.childId ?? null,
      intentType: d.intentType,
      intentSource: d.intentSource,
      intentPriority: d.intentPriority ?? 50,
      state: "pending",
      title: d.title,
      subtitle: d.subtitle ?? "",
      amyContinuationLine: d.amyContinuationLine ?? "",
      actionTarget: d.actionTarget,
      entityId: entityKey,
      href: d.href,
      progressPct: d.progressPct ?? 0,
      progressJson: d.progressJson ?? {},
      deviceId: d.deviceId ?? null,
      expiresAt,
    });
    await logIntentEvent(userId, intentId, "intent_created", { source: d.intentSource, derived: true });
  }
}

export async function createUserIntent(input: CreateIntentInput): Promise<UserIntent> {
  const now = new Date();
  const ttlHours = input.ttlHours ?? 72;
  const intentId = newIntentId();
  const entityKey = input.entityId ?? input.intentType;

  const [existing] = await db
    .select()
    .from(userIntentsTable)
    .where(
      and(
        eq(userIntentsTable.userId, input.userId),
        eq(userIntentsTable.intentType, input.intentType),
        eq(userIntentsTable.entityId, entityKey),
        inArray(userIntentsTable.state, [...ACTIVE_STATES]),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(userIntentsTable)
      .set({
        title: input.title,
        subtitle: input.subtitle ?? "",
        amyContinuationLine: input.amyContinuationLine ?? "",
        href: input.href,
        progressPct: input.progressPct ?? 0,
        progressJson: input.progressJson ?? {},
        intentPriority: input.intentPriority ?? 50,
        intentSource: input.intentSource,
        updatedAt: now,
        deviceId: input.deviceId ?? existing.deviceId,
      })
      .where(eq(userIntentsTable.id, existing.id));
    return rowToIntent({ ...existing, updatedAt: now });
  }

  const expiresAt = new Date(now.getTime() + ttlHours * 3_600_000);
  const [row] = await db
    .insert(userIntentsTable)
    .values({
      intentId,
      userId: input.userId,
      childId: input.childId ?? null,
      intentType: input.intentType,
      intentSource: input.intentSource,
      intentPriority: input.intentPriority ?? 50,
      state: "pending",
      title: input.title,
      subtitle: input.subtitle ?? "",
      amyContinuationLine: input.amyContinuationLine ?? "",
      actionTarget: input.actionTarget,
      entityId: entityKey,
      href: input.href,
      progressPct: input.progressPct ?? 0,
      progressJson: input.progressJson ?? {},
      deviceId: input.deviceId ?? null,
      expiresAt,
    })
    .returning();

  await logIntentEvent(input.userId, intentId, "intent_created", {
    source: input.intentSource,
    intentType: input.intentType,
  });

  return rowToIntent(row!);
}

export async function transitionUserIntent(
  userId: string,
  intentId: string,
  toState: IntentState,
): Promise<UserIntent | null> {
  const [row] = await db
    .select()
    .from(userIntentsTable)
    .where(and(eq(userIntentsTable.userId, userId), eq(userIntentsTable.intentId, intentId)))
    .limit(1);
  if (!row) return null;

  const fromState = row.state as IntentState;
  assertIntentTransition(fromState, toState);

  const now = new Date();
  const patch: Partial<typeof userIntentsTable.$inferInsert> = {
    state: toState,
    updatedAt: now,
  };
  if (toState === "started" && !row.startedAt) patch.startedAt = now;
  if (toState === "in_progress") patch.startedAt = row.startedAt ?? now;
  if (toState === "pending" && (fromState === "started" || fromState === "in_progress")) {
    patch.interruptedAt = now;
  }
  if (toState === "completed") patch.completedAt = now;

  const [updated] = await db
    .update(userIntentsTable)
    .set(patch)
    .where(eq(userIntentsTable.id, row.id))
    .returning();

  const analyticsEvent = analyticsEventForTransition(fromState, toState);
  if (analyticsEvent) {
    await logIntentEvent(userId, intentId, analyticsEvent, { from: fromState, to: toState });
  }

  if (toState === "completed") {
    await recordFamilyMemory(userId, {
      category: "intervention",
      key: `intent:${row.intentType}`,
      outcome: "positive",
      context: row.title,
    });
  } else if (toState === "abandoned") {
    await recordFamilyMemory(userId, {
      category: "intervention",
      key: `intent:${row.intentType}`,
      outcome: "negative",
      context: row.title,
    });
  }

  return rowToIntent(updated!);
}

export async function interruptActiveIntent(
  userId: string,
  intentId: string,
): Promise<UserIntent | null> {
  const [row] = await db
    .select()
    .from(userIntentsTable)
    .where(and(eq(userIntentsTable.userId, userId), eq(userIntentsTable.intentId, intentId)))
    .limit(1);
  if (!row) return null;

  const next = transitionOnInterruption(row.state as IntentState);
  if (next === row.state) return rowToIntent(row);

  return transitionUserIntent(userId, intentId, next);
}

export async function getContinueJourney(userId: string) {
  await upsertDerivedIntents(userId);

  const now = new Date();
  const rows = await db
    .select()
    .from(userIntentsTable)
    .where(
      and(
        eq(userIntentsTable.userId, userId),
        inArray(userIntentsTable.state, [...ACTIVE_STATES]),
      ),
    )
    .orderBy(desc(userIntentsTable.intentPriority), desc(userIntentsTable.updatedAt))
    .limit(20);

  const intents = rows
    .map(rowToIntent)
    .filter((i) => new Date(i.expiresAt).getTime() > now.getTime());

  return {
    engineVersion: INTENT_RECOVERY_ENGINE_VERSION,
    ...buildContinueJourneyView(intents),
  };
}

export async function getIntentAnalytics(userId: string, windowDays = 30) {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const rows = await db
    .select()
    .from(userIntentsTable)
    .where(and(eq(userIntentsTable.userId, userId), gte(userIntentsTable.createdAt, since)))
    .limit(500);

  return {
    windowDays,
    roi: computeIntentRoi(rows.map(rowToIntent)),
    engineVersion: INTENT_RECOVERY_ENGINE_VERSION,
  };
}

export async function createIntentFromHubAction(
  userId: string,
  input: {
    childId?: number | null;
    childName?: string;
    title: string;
    href: string;
    actionTarget: string;
    entityId?: string | null;
    intentSource?: CreateIntentInput["intentSource"];
    intentType?: CreateIntentInput["intentType"];
  },
): Promise<UserIntent> {
  return createUserIntent(
    intentFromAction({
      userId,
      childId: input.childId,
      childName: input.childName,
      intentSource: input.intentSource ?? "parent_hub",
      intentType: input.intentType ?? "AMY_RECOMMENDED_ACTION",
      title: input.title,
      actionTarget: input.actionTarget as UserIntent["actionTarget"],
      entityId: input.entityId,
      href: input.href,
    }),
  );
}
