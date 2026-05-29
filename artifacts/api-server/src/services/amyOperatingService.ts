import { and, desc, eq } from "drizzle-orm";
import {
  db,
  amyDecisionLogTable,
  amyDailyBriefingsTable,
  amyKnowledgeGraphTable,
  amyTimelineEventsTable,
  notificationPreferencesTable,
} from "@workspace/db";
import {
  buildAmyOperatingContext,
  answerNaturalLanguageCommand,
  buildHubDashboardView,
  AMY_OPERATING_ENGINE_VERSION,
  type AmyOperatingContext,
  type TimelineEvent,
  type HubDashboardView,
} from "@workspace/amy-operating-layer";
import { refreshFamilyIntelligence } from "./unifiedFamilyIntelligenceService.js";
import { recordFamilyMemory } from "./unifiedFamilyIntelligenceService.js";
import { getContinueJourney } from "./intentRecoveryService.js";
import { getAmyEvidenceAnswer, getRealityDashboard, recordInterventionDispatched } from "./realityValidationService.js";

function todayLocalDateString(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function loadTimelineHistory(userId: string): Promise<TimelineEvent[]> {
  const rows = await db
    .select()
    .from(amyTimelineEventsTable)
    .where(eq(amyTimelineEventsTable.userId, userId))
    .orderBy(desc(amyTimelineEventsTable.occurredAt))
    .limit(100);
  return rows.map((r) => ({
    id: String(r.id),
    eventType: r.eventType as TimelineEvent["eventType"],
    title: r.title,
    description: r.description ?? "",
    occurredAt: r.occurredAt.toISOString(),
  }));
}

async function persistOperatingArtifacts(
  userId: string,
  localDate: string,
  ctx: AmyOperatingContext,
): Promise<void> {
  await db.insert(amyDailyBriefingsTable).values({
    userId,
    localDate,
    briefingJson: ctx.dailyBriefing,
    engineVersion: AMY_OPERATING_ENGINE_VERSION,
  });

  await db
    .insert(amyKnowledgeGraphTable)
    .values({ userId, graphJson: ctx.knowledgeGraph })
    .onConflictDoUpdate({
      target: amyKnowledgeGraphTable.userId,
      set: { graphJson: ctx.knowledgeGraph, updatedAt: new Date() },
    });

  for (const ev of ctx.executiveMode.timeline.slice(0, 5)) {
    const exists = await db
      .select({ id: amyTimelineEventsTable.id })
      .from(amyTimelineEventsTable)
      .where(and(eq(amyTimelineEventsTable.userId, userId), eq(amyTimelineEventsTable.title, ev.title)))
      .limit(1);
    if (exists.length > 0) continue;
    await db.insert(amyTimelineEventsTable).values({
      userId,
      childId: ctx.snapshot.primaryChildId,
      eventType: ev.eventType,
      title: ev.title,
      description: ev.description,
      occurredAt: new Date(ev.occurredAt),
    });
  }
}

/**
 * Build full Amy Operating Context — the family OS brain for Amy AI.
 */
export async function getAmyOperatingContext(userId: string): Promise<AmyOperatingContext> {
  const [prefs] = await db
    .select({ timezone: notificationPreferencesTable.timezone })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  const tz = prefs?.timezone ?? "Asia/Kolkata";
  const localDate = todayLocalDateString(tz);

  const snapshot = await refreshFamilyIntelligence(userId, tz);
  const timelineHistory = await loadTimelineHistory(userId);
  const ctx = buildAmyOperatingContext(snapshot, { localDate, timelineHistory });

  await persistOperatingArtifacts(userId, localDate, ctx);
  return ctx;
}

export async function getAmyDailyBriefing(userId: string) {
  const ctx = await getAmyOperatingContext(userId);
  const continuation = await getContinueJourney(userId);
  return {
    ...ctx.dailyBriefing,
    continuationLine: continuation.amyLine || undefined,
    topUnfinishedIntent: continuation.topIntent,
  };
}

export async function getAmyWeeklyReview(userId: string) {
  const ctx = await getAmyOperatingContext(userId);
  return ctx.weeklyReview;
}

export async function getAmyExecutiveMode(userId: string) {
  const ctx = await getAmyOperatingContext(userId);
  return ctx.executiveMode;
}

export async function getHubDashboard(userId: string) {
  const ctx = await getAmyOperatingContext(userId);
  const continueJourney = await getContinueJourney(userId);
  const hubView = buildHubDashboardView(ctx);

  void recordInterventionDispatched(userId, {
    childId: ctx.snapshot.primaryChildId,
    interventionId: hubView.primaryAction?.id ?? hubView.amyRecommendation.title.slice(0, 40),
    interventionType: hubView.primaryAction?.surface ?? "amy_recommendation",
    surface: "parent_hub",
    recommendationTitle: hubView.primaryAction?.title ?? hubView.amyRecommendation.title,
    recommendationKey: `hub_${hubView.primaryAction?.id ?? hubView.amyRecommendation.title.toLowerCase().replace(/\s+/g, "_").slice(0, 48)}`,
  }).catch(() => {});

  const { dashboard: realitySummary } = await getRealityDashboard(userId).catch(() => ({
    dashboard: null,
  }));

  return {
    ...hubView,
    continueJourney,
    realitySummary,
  };
}

export async function askAmyOperatingLayer(userId: string, question: string) {
  const ctx = await getAmyOperatingContext(userId);

  const evidencePattern = /why.*recommend|why do you|what worked|evidence|prove|reading challenge/i;
  if (evidencePattern.test(question)) {
    const evidence = await getAmyEvidenceAnswer(userId, question);
    return {
      answer: evidence.answer,
      sources: evidence.evidence.map((e) => `${e.interventionKey}: ${e.delta} (${e.scorecard})`),
      confidence: evidence.confidence,
      operatingContext: ctx.engineVersion,
    };
  }

  const result = answerNaturalLanguageCommand(question, ctx.snapshot);

  await db.insert(amyDecisionLogTable).values({
    userId,
    recommendationId: `nl_${Date.now()}`,
    recommendationTitle: question.slice(0, 200),
    recommendationType: "nl_command",
    userResponse: "accepted",
    contextJson: { answer: result.answer, sources: result.sources },
  });

  return { ...result, operatingContext: ctx.engineVersion };
}

export async function recordAmyDecisionFeedback(
  userId: string,
  input: {
    recommendationId: string;
    recommendationTitle: string;
    userResponse: "accepted" | "dismissed" | "ignored" | "completed";
    outcomeAchieved?: boolean;
  },
): Promise<void> {
  await db.insert(amyDecisionLogTable).values({
    userId,
    recommendationId: input.recommendationId,
    recommendationTitle: input.recommendationTitle,
    userResponse: input.userResponse,
    outcomeAchieved: input.outcomeAchieved ?? null,
  });

  if (input.outcomeAchieved === true) {
    await recordFamilyMemory(userId, {
      category: "intervention",
      key: input.recommendationId,
      outcome: "positive",
      context: input.recommendationTitle,
    });
  }
}

export function buildAmyAssistantSystemPrompt(ctx: AmyOperatingContext): string {
  return ctx.systemPromptBlock;
}
