import { eq, or, inArray, like } from "drizzle-orm";
import {
  db,
  childrenTable,
  behaviorsTable,
  routinesTable,
  routineFeedbackTable,
  childDailySignalsTable,
  childPredictionSnapshotsTable,
  routinePersonalizationSnapshotsTable,
  routineActivityOutcomesTable,
  childCaregiversTable,
  childPersonalityProfilesTable,
  childContentLearningProfilesTable,
  childLearningProgressTable,
  learningProgressTable,
  skillGraphProgressTable,
  abacusProgressTable,
  lifeSkillsProgressTable,
  phonicsProgressTable,
  phonicsCurriculumProgressTable,
  phonicsDailyPlansTable,
  phonicsTestResultsTable,
  phonicsDownloadsTable,
  speechProgressTable,
  speechConversationMemoryTable,
  speechPracticeLogTable,
  speechExpertWaitlistTable,
  spellingProgressTable,
  spellingSessionsTable,
  spellingTournamentsTable,
  spellingCompetitionScoresTable,
  olympiadChildStatsTable,
  olympiadScoresTable,
  dailyPuzzleProgressTable,
  storyWatchProgressTable,
  funsheetDownloadsTable,
  coloringDownloadsTable,
  napSessionsTable,
  crySessionsTable,
  infantCareLogsTable,
  infantMilestoneProgressTable,
  infantGrowthMeasurementsTable,
  infantWellbeingCheckinsTable,
  infantNotificationPrefsTable,
  infantProductAnalyticsEventsTable,
  vaccinationLogsTable,
  analyticsEventsTable,
  crashEventsTable,
  nbaDecisionLogsTable,
  featureNotificationSchedulesTable,
  familyGoalsTable,
  familyMomentsTable,
  amyTimelineEventsTable,
  parentHubJourneyTable,
  parentTaskCompletionsTable,
  userIntentsTable,
  userIntentEventsTable,
  interventionLedgerTable,
  parentProfilesTable,
  onboardingProfilesTable,
  notificationPreferencesTable,
  babysittersTable,
  customRecipesTable,
  subscriptionsTable,
  usageDailyTable,
  pushTokensTable,
  ptmPrepDataTable,
  notificationFatigueStateTable,
  notificationLogTable,
  notificationOutcomeEventsTable,
  notificationCampaignProgressTable,
  debugLogsTable,
  userProgressTable,
  userFeedbackTable,
  userAiMessagesTable,
  userCoachSessionsTable,
  userCoachIntelligenceTable,
  coachJourneyTable,
  coachWinGenerationsTable,
  userActivationJourneyTable,
  routineJourneyTable,
  gamingWalletTable,
  featureUsageTable,
  featureFeedbackTable,
  familyStrategyProfileTable,
  familyIntelligenceSnapshotsTable,
  familyDigitalTwinTable,
  familyMemoryTable,
  amyDecisionLogTable,
  amyDailyBriefingsTable,
  amyKnowledgeGraphTable,
  referralsTable,
  giftTokensTable,
  familyLearningGraphsTable,
  adminPremiumGrantsTable,
  aiCacheTable,
  ttsCacheTable,
  coachAudioCacheTable,
  revenuecatWebhookEventsTable,
} from "@workspace/db";
import { logger } from "../lib/logger.js";

export type DeletionAuditEntry = {
  table: string;
  rows: number;
};

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function countDeleted(
  tx: DbTx,
  tableName: string,
  deleted: { id?: unknown }[],
  audit: DeletionAuditEntry[],
): Promise<void> {
  if (deleted.length > 0) {
    audit.push({ table: tableName, rows: deleted.length });
  }
}

/** Remove all rows scoped to a single child (integer child_id or text child_id). */
export async function purgeChildScopedData(
  tx: DbTx,
  childId: number,
  audit: DeletionAuditEntry[],
): Promise<void> {
  const childIdStr = String(childId);

  const intChildDeletes: Array<{ table: string; run: () => Promise<{ id?: unknown }[]> }> = [
    { table: "behaviors", run: () => tx.delete(behaviorsTable).where(eq(behaviorsTable.childId, childId)).returning({ id: behaviorsTable.id }) },
    { table: "routines", run: () => tx.delete(routinesTable).where(eq(routinesTable.childId, childId)).returning({ id: routinesTable.id }) },
    { table: "routine_feedback", run: () => tx.delete(routineFeedbackTable).where(eq(routineFeedbackTable.childId, childId)).returning({ id: routineFeedbackTable.id }) },
    { table: "child_daily_signals", run: () => tx.delete(childDailySignalsTable).where(eq(childDailySignalsTable.childId, childId)).returning({ id: childDailySignalsTable.id }) },
    { table: "child_prediction_snapshots", run: () => tx.delete(childPredictionSnapshotsTable).where(eq(childPredictionSnapshotsTable.childId, childId)).returning({ id: childPredictionSnapshotsTable.id }) },
    { table: "child_caregivers", run: () => tx.delete(childCaregiversTable).where(eq(childCaregiversTable.childId, childId)).returning({ id: childCaregiversTable.id }) },
    { table: "child_personality_profiles", run: () => tx.delete(childPersonalityProfilesTable).where(eq(childPersonalityProfilesTable.childId, childId)).returning({ id: childPersonalityProfilesTable.id }) },
    { table: "child_content_learning_profiles", run: () => tx.delete(childContentLearningProfilesTable).where(eq(childContentLearningProfilesTable.childId, childId)).returning({ id: childContentLearningProfilesTable.id }) },
    { table: "child_learning_progress", run: () => tx.delete(childLearningProgressTable).where(eq(childLearningProgressTable.childId, childId)).returning({ id: childLearningProgressTable.id }) },
    { table: "learning_progress", run: () => tx.delete(learningProgressTable).where(eq(learningProgressTable.childId, childId)).returning({ id: learningProgressTable.id }) },
    { table: "skill_graph_progress", run: () => tx.delete(skillGraphProgressTable).where(eq(skillGraphProgressTable.childId, childId)).returning({ id: skillGraphProgressTable.id }) },
    { table: "abacus_progress", run: () => tx.delete(abacusProgressTable).where(eq(abacusProgressTable.childId, childId)).returning({ id: abacusProgressTable.id }) },
    { table: "life_skills_progress", run: () => tx.delete(lifeSkillsProgressTable).where(eq(lifeSkillsProgressTable.childId, childId)).returning({ id: lifeSkillsProgressTable.id }) },
    { table: "phonics_progress", run: () => tx.delete(phonicsProgressTable).where(eq(phonicsProgressTable.childId, childId)).returning({ id: phonicsProgressTable.id }) },
    { table: "phonics_curriculum_progress", run: () => tx.delete(phonicsCurriculumProgressTable).where(eq(phonicsCurriculumProgressTable.childId, childId)).returning({ id: phonicsCurriculumProgressTable.id }) },
    { table: "phonics_daily_plans", run: () => tx.delete(phonicsDailyPlansTable).where(eq(phonicsDailyPlansTable.childId, childId)).returning({ id: phonicsDailyPlansTable.id }) },
    { table: "phonics_test_results", run: () => tx.delete(phonicsTestResultsTable).where(eq(phonicsTestResultsTable.childId, childId)).returning({ id: phonicsTestResultsTable.id }) },
    { table: "speech_progress", run: () => tx.delete(speechProgressTable).where(eq(speechProgressTable.childId, childId)).returning({ id: speechProgressTable.id }) },
    { table: "speech_conversation_memory", run: () => tx.delete(speechConversationMemoryTable).where(eq(speechConversationMemoryTable.childId, childId)).returning({ id: speechConversationMemoryTable.id }) },
    { table: "speech_practice_log", run: () => tx.delete(speechPracticeLogTable).where(eq(speechPracticeLogTable.childId, childId)).returning({ id: speechPracticeLogTable.id }) },
    { table: "spelling_progress", run: () => tx.delete(spellingProgressTable).where(eq(spellingProgressTable.childId, childId)).returning({ id: spellingProgressTable.id }) },
    { table: "spelling_sessions", run: () => tx.delete(spellingSessionsTable).where(eq(spellingSessionsTable.childId, childId)).returning({ id: spellingSessionsTable.id }) },
    { table: "spelling_tournaments", run: () => tx.delete(spellingTournamentsTable).where(eq(spellingTournamentsTable.childId, childId)).returning({ id: spellingTournamentsTable.id }) },
    { table: "spelling_competition_scores", run: () => tx.delete(spellingCompetitionScoresTable).where(eq(spellingCompetitionScoresTable.childId, childId)).returning({ id: spellingCompetitionScoresTable.id }) },
    { table: "olympiad_child_stats", run: () => tx.delete(olympiadChildStatsTable).where(eq(olympiadChildStatsTable.childId, childId)).returning({ id: olympiadChildStatsTable.id }) },
    { table: "olympiad_scores", run: () => tx.delete(olympiadScoresTable).where(eq(olympiadScoresTable.childId, childId)).returning({ id: olympiadScoresTable.id }) },
    { table: "daily_puzzle_progress", run: () => tx.delete(dailyPuzzleProgressTable).where(eq(dailyPuzzleProgressTable.childId, childId)).returning({ id: dailyPuzzleProgressTable.id }) },
    { table: "story_watch_progress", run: () => tx.delete(storyWatchProgressTable).where(eq(storyWatchProgressTable.childId, childId)).returning({ id: storyWatchProgressTable.id }) },
    { table: "funsheet_downloads", run: () => tx.delete(funsheetDownloadsTable).where(eq(funsheetDownloadsTable.childId, childId)).returning({ id: funsheetDownloadsTable.id }) },
    { table: "coloring_downloads", run: () => tx.delete(coloringDownloadsTable).where(eq(coloringDownloadsTable.childId, childId)).returning({ id: coloringDownloadsTable.id }) },
    { table: "nap_sessions", run: () => tx.delete(napSessionsTable).where(eq(napSessionsTable.childId, childId)).returning({ id: napSessionsTable.id }) },
    { table: "cry_sessions", run: () => tx.delete(crySessionsTable).where(eq(crySessionsTable.childId, childId)).returning({ id: crySessionsTable.id }) },
    { table: "infant_care_logs", run: () => tx.delete(infantCareLogsTable).where(eq(infantCareLogsTable.childId, childId)).returning({ id: infantCareLogsTable.id }) },
    { table: "infant_milestone_progress", run: () => tx.delete(infantMilestoneProgressTable).where(eq(infantMilestoneProgressTable.childId, childId)).returning({ id: infantMilestoneProgressTable.id }) },
    { table: "infant_growth_measurements", run: () => tx.delete(infantGrowthMeasurementsTable).where(eq(infantGrowthMeasurementsTable.childId, childId)).returning({ id: infantGrowthMeasurementsTable.id }) },
    { table: "infant_wellbeing_checkins", run: () => tx.delete(infantWellbeingCheckinsTable).where(eq(infantWellbeingCheckinsTable.childId, childId)).returning({ id: infantWellbeingCheckinsTable.id }) },
    { table: "infant_notification_prefs", run: () => tx.delete(infantNotificationPrefsTable).where(eq(infantNotificationPrefsTable.childId, childId)).returning({ id: infantNotificationPrefsTable.id }) },
    { table: "vaccination_logs", run: () => tx.delete(vaccinationLogsTable).where(eq(vaccinationLogsTable.childId, childId)).returning({ id: vaccinationLogsTable.id }) },
    { table: "nba_decision_logs", run: () => tx.delete(nbaDecisionLogsTable).where(eq(nbaDecisionLogsTable.childId, childId)).returning({ id: nbaDecisionLogsTable.id }) },
    { table: "parent_task_completions", run: () => tx.delete(parentTaskCompletionsTable).where(eq(parentTaskCompletionsTable.childId, childId)).returning({ id: parentTaskCompletionsTable.id }) },
  ];

  for (const { table, run } of intChildDeletes) {
    await countDeleted(tx, table, await run(), audit);
  }

  // Nullable child_id columns
  const nullableChildDeletes: Array<{ table: string; run: () => Promise<{ id?: unknown }[]> }> = [
    { table: "phonics_downloads", run: () => tx.delete(phonicsDownloadsTable).where(eq(phonicsDownloadsTable.childId, childId)).returning({ id: phonicsDownloadsTable.id }) },
    { table: "speech_expert_waitlist", run: () => tx.delete(speechExpertWaitlistTable).where(eq(speechExpertWaitlistTable.childId, childId)).returning({ id: speechExpertWaitlistTable.id }) },
    { table: "infant_product_analytics_events", run: () => tx.delete(infantProductAnalyticsEventsTable).where(eq(infantProductAnalyticsEventsTable.childId, childId)).returning({ id: infantProductAnalyticsEventsTable.id }) },
    { table: "analytics_events", run: () => tx.delete(analyticsEventsTable).where(eq(analyticsEventsTable.childId, childId)).returning({ id: analyticsEventsTable.id }) },
    { table: "feature_notification_schedules", run: () => tx.delete(featureNotificationSchedulesTable).where(eq(featureNotificationSchedulesTable.childId, childId)).returning({ id: featureNotificationSchedulesTable.id }) },
    { table: "family_goals", run: () => tx.delete(familyGoalsTable).where(eq(familyGoalsTable.childId, childId)).returning({ id: familyGoalsTable.id }) },
    { table: "family_moments", run: () => tx.delete(familyMomentsTable).where(eq(familyMomentsTable.childId, childId)).returning({ id: familyMomentsTable.id }) },
    { table: "amy_timeline_events", run: () => tx.delete(amyTimelineEventsTable).where(eq(amyTimelineEventsTable.childId, childId)).returning({ id: amyTimelineEventsTable.id }) },
    { table: "parent_hub_journey", run: () => tx.delete(parentHubJourneyTable).where(eq(parentHubJourneyTable.childId, childId)).returning({ id: parentHubJourneyTable.id }) },
    { table: "user_intents", run: () => tx.delete(userIntentsTable).where(eq(userIntentsTable.childId, childId)).returning({ id: userIntentsTable.id }) },
    { table: "intervention_ledger", run: () => tx.delete(interventionLedgerTable).where(eq(interventionLedgerTable.childId, childId)).returning({ id: interventionLedgerTable.id }) },
  ];

  for (const { table, run } of nullableChildDeletes) {
    await countDeleted(tx, table, await run(), audit);
  }

  // Text child_id columns
  const textChildDeletes: Array<{ table: string; run: () => Promise<{ id?: unknown }[]> }> = [
    { table: "routine_personalization_snapshots", run: () => tx.delete(routinePersonalizationSnapshotsTable).where(eq(routinePersonalizationSnapshotsTable.childId, childIdStr)).returning({ id: routinePersonalizationSnapshotsTable.id }) },
    { table: "routine_activity_outcomes", run: () => tx.delete(routineActivityOutcomesTable).where(eq(routineActivityOutcomesTable.childId, childIdStr)).returning({ id: routineActivityOutcomesTable.id }) },
    { table: "crash_events", run: () => tx.delete(crashEventsTable).where(eq(crashEventsTable.childId, childIdStr)).returning({ id: crashEventsTable.id }) },
  ];

  for (const { table, run } of textChildDeletes) {
    await countDeleted(tx, table, await run(), audit);
  }

  // Clear primaryChildId references without deleting family snapshots
  await tx
    .update(familyIntelligenceSnapshotsTable)
    .set({ primaryChildId: null })
    .where(eq(familyIntelligenceSnapshotsTable.primaryChildId, childId));
  await tx
    .update(familyDigitalTwinTable)
    .set({ primaryChildId: null })
    .where(eq(familyDigitalTwinTable.primaryChildId, childId));
}

/** Remove cache rows and webhook events keyed to a user (call before coach row deletes). */
async function purgeUserLinkedCaches(
  tx: DbTx,
  userId: string,
  planCacheKeys: string[],
  audit: DeletionAuditEntry[],
): Promise<void> {
  await countDeleted(
    tx,
    "family_learning_graphs",
    await tx
      .delete(familyLearningGraphsTable)
      .where(eq(familyLearningGraphsTable.familyId, userId))
      .returning({ id: familyLearningGraphsTable.id }),
    audit,
  );

  await countDeleted(
    tx,
    "revenuecat_webhook_events",
    await tx
      .delete(revenuecatWebhookEventsTable)
      .where(eq(revenuecatWebhookEventsTable.appUserId, userId))
      .returning({ id: revenuecatWebhookEventsTable.eventId }),
    audit,
  );

  await countDeleted(
    tx,
    "ai_cache",
    await tx
      .delete(aiCacheTable)
      .where(like(aiCacheTable.cacheKey, `%${userId}%`))
      .returning({ id: aiCacheTable.id }),
    audit,
  );

  if (planCacheKeys.length === 0) return;

  const coachAudioRows = await tx
    .select({ ttsCacheKey: coachAudioCacheTable.ttsCacheKey })
    .from(coachAudioCacheTable)
    .where(inArray(coachAudioCacheTable.planCacheKey, planCacheKeys));
  const ttsKeys = [...new Set(coachAudioRows.map((r) => r.ttsCacheKey))];

  await countDeleted(
    tx,
    "coach_audio_cache",
    await tx
      .delete(coachAudioCacheTable)
      .where(inArray(coachAudioCacheTable.planCacheKey, planCacheKeys))
      .returning({ id: coachAudioCacheTable.id }),
    audit,
  );

  if (ttsKeys.length > 0) {
    await countDeleted(
      tx,
      "tts_cache",
      await tx
        .delete(ttsCacheTable)
        .where(inArray(ttsCacheTable.cacheKey, ttsKeys))
        .returning({ id: ttsCacheTable.id }),
      audit,
    );
  }
}

export type PurgeUserDataOptions = {
  accountEmail?: string | null;
};

/** Remove all user-owned data including every child subtree. */
export async function purgeUserData(
  tx: DbTx,
  userId: string,
  audit: DeletionAuditEntry[],
  options?: PurgeUserDataOptions,
): Promise<number[]> {
  const userChildren = await tx
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));
  const childIds = userChildren.map((c) => c.id);

  for (const childId of childIds) {
    await purgeChildScopedData(tx, childId, audit);
  }

  // Co-parent links where this user is a caregiver (not owner)
  await countDeleted(
    tx,
    "child_caregivers_by_user",
    await tx.delete(childCaregiversTable).where(eq(childCaregiversTable.userId, userId)).returning({ id: childCaregiversTable.id }),
    audit,
  );

  // Invites sent by this user to other caregivers
  await countDeleted(
    tx,
    "child_caregivers_invited_by",
    await tx
      .delete(childCaregiversTable)
      .where(eq(childCaregiversTable.invitedByUserId, userId))
      .returning({ id: childCaregiversTable.id }),
    audit,
  );

  const coachPlanKeys = await tx
    .select({ cacheKey: coachWinGenerationsTable.cacheKey })
    .from(coachWinGenerationsTable)
    .where(eq(coachWinGenerationsTable.userId, userId));
  const planCacheKeys = [...new Set(coachPlanKeys.map((r) => r.cacheKey))];

  const [subscriptionRow] = await tx
    .select({ phoneNumber: subscriptionsTable.phoneNumber })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);
  const [parentRow] = await tx
    .select({ mobileNumber: parentProfilesTable.mobileNumber })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);

  await purgeUserLinkedCaches(tx, userId, planCacheKeys, audit);

  const grantConditions = [];
  const normalizedEmail = options?.accountEmail?.trim().toLowerCase();
  if (normalizedEmail) {
    grantConditions.push(eq(adminPremiumGrantsTable.email, normalizedEmail));
  }
  const phone =
    subscriptionRow?.phoneNumber?.trim() || parentRow?.mobileNumber?.trim() || null;
  if (phone) {
    grantConditions.push(eq(adminPremiumGrantsTable.phoneNumber, phone));
  }
  if (grantConditions.length > 0) {
    await countDeleted(
      tx,
      "admin_premium_grants",
      await tx
        .delete(adminPremiumGrantsTable)
        .where(or(...grantConditions))
        .returning({ id: adminPremiumGrantsTable.id }),
      audit,
    );
  }

  const userDeletes: Array<{ table: string; run: () => Promise<{ id?: unknown }[]> }> = [
    { table: "babysitters", run: () => tx.delete(babysittersTable).where(eq(babysittersTable.userId, userId)).returning({ id: babysittersTable.id }) },
    { table: "parent_profiles", run: () => tx.delete(parentProfilesTable).where(eq(parentProfilesTable.userId, userId)).returning({ id: parentProfilesTable.id }) },
    { table: "onboarding_profiles", run: () => tx.delete(onboardingProfilesTable).where(eq(onboardingProfilesTable.userId, userId)).returning({ id: onboardingProfilesTable.id }) },
    { table: "notification_preferences", run: () => tx.delete(notificationPreferencesTable).where(eq(notificationPreferencesTable.userId, userId)).returning({ id: notificationPreferencesTable.id }) },
    { table: "custom_recipes", run: () => tx.delete(customRecipesTable).where(eq(customRecipesTable.userId, userId)).returning({ id: customRecipesTable.id }) },
    { table: "subscriptions", run: () => tx.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId)).returning({ id: subscriptionsTable.id }) },
    { table: "usage_daily", run: () => tx.delete(usageDailyTable).where(eq(usageDailyTable.userId, userId)).returning({ id: usageDailyTable.id }) },
    { table: "push_tokens", run: () => tx.delete(pushTokensTable).where(eq(pushTokensTable.userId, userId)).returning({ id: pushTokensTable.id }) },
    { table: "ptm_prep_data", run: () => tx.delete(ptmPrepDataTable).where(eq(ptmPrepDataTable.userId, userId)).returning({ id: ptmPrepDataTable.userId }) },
    { table: "notification_fatigue_state", run: () => tx.delete(notificationFatigueStateTable).where(eq(notificationFatigueStateTable.userId, userId)).returning({ id: notificationFatigueStateTable.userId }) },
    { table: "notification_log", run: () => tx.delete(notificationLogTable).where(eq(notificationLogTable.userId, userId)).returning({ id: notificationLogTable.id }) },
    { table: "notification_outcome_events", run: () => tx.delete(notificationOutcomeEventsTable).where(eq(notificationOutcomeEventsTable.userId, userId)).returning({ id: notificationOutcomeEventsTable.id }) },
    { table: "notification_campaign_progress", run: () => tx.delete(notificationCampaignProgressTable).where(eq(notificationCampaignProgressTable.userId, userId)).returning({ id: notificationCampaignProgressTable.id }) },
    { table: "debug_logs", run: () => tx.delete(debugLogsTable).where(eq(debugLogsTable.userId, userId)).returning({ id: debugLogsTable.id }) },
    { table: "user_progress", run: () => tx.delete(userProgressTable).where(eq(userProgressTable.userId, userId)).returning({ id: userProgressTable.id }) },
    { table: "user_feedback", run: () => tx.delete(userFeedbackTable).where(eq(userFeedbackTable.userId, userId)).returning({ id: userFeedbackTable.id }) },
    { table: "user_ai_messages", run: () => tx.delete(userAiMessagesTable).where(eq(userAiMessagesTable.userId, userId)).returning({ id: userAiMessagesTable.id }) },
    { table: "user_coach_sessions", run: () => tx.delete(userCoachSessionsTable).where(eq(userCoachSessionsTable.userId, userId)).returning({ id: userCoachSessionsTable.id }) },
    { table: "user_coach_intelligence", run: () => tx.delete(userCoachIntelligenceTable).where(eq(userCoachIntelligenceTable.userId, userId)).returning({ id: userCoachIntelligenceTable.userId }) },
    { table: "coach_journey", run: () => tx.delete(coachJourneyTable).where(eq(coachJourneyTable.userId, userId)).returning({ id: coachJourneyTable.id }) },
    { table: "coach_win_generations", run: () => tx.delete(coachWinGenerationsTable).where(eq(coachWinGenerationsTable.userId, userId)).returning({ id: coachWinGenerationsTable.id }) },
    { table: "user_activation_journey", run: () => tx.delete(userActivationJourneyTable).where(eq(userActivationJourneyTable.userId, userId)).returning({ id: userActivationJourneyTable.id }) },
    { table: "routine_journey", run: () => tx.delete(routineJourneyTable).where(eq(routineJourneyTable.userId, userId)).returning({ id: routineJourneyTable.id }) },
    { table: "gaming_wallet", run: () => tx.delete(gamingWalletTable).where(eq(gamingWalletTable.userId, userId)).returning({ id: gamingWalletTable.id }) },
    { table: "feature_usage", run: () => tx.delete(featureUsageTable).where(eq(featureUsageTable.userId, userId)).returning({ id: featureUsageTable.id }) },
    { table: "feature_feedback", run: () => tx.delete(featureFeedbackTable).where(eq(featureFeedbackTable.userId, userId)).returning({ id: featureFeedbackTable.id }) },
    { table: "user_intents_by_user", run: () => tx.delete(userIntentsTable).where(eq(userIntentsTable.userId, userId)).returning({ id: userIntentsTable.id }) },
    { table: "user_intent_events", run: () => tx.delete(userIntentEventsTable).where(eq(userIntentEventsTable.userId, userId)).returning({ id: userIntentEventsTable.id }) },
    { table: "family_strategy_profile", run: () => tx.delete(familyStrategyProfileTable).where(eq(familyStrategyProfileTable.userId, userId)).returning({ id: familyStrategyProfileTable.id }) },
    { table: "family_intelligence_snapshots", run: () => tx.delete(familyIntelligenceSnapshotsTable).where(eq(familyIntelligenceSnapshotsTable.userId, userId)).returning({ id: familyIntelligenceSnapshotsTable.id }) },
    { table: "family_digital_twin", run: () => tx.delete(familyDigitalTwinTable).where(eq(familyDigitalTwinTable.userId, userId)).returning({ id: familyDigitalTwinTable.id }) },
    { table: "family_memory", run: () => tx.delete(familyMemoryTable).where(eq(familyMemoryTable.userId, userId)).returning({ id: familyMemoryTable.id }) },
    { table: "family_goals_by_user", run: () => tx.delete(familyGoalsTable).where(eq(familyGoalsTable.userId, userId)).returning({ id: familyGoalsTable.id }) },
    { table: "family_moments_by_user", run: () => tx.delete(familyMomentsTable).where(eq(familyMomentsTable.userId, userId)).returning({ id: familyMomentsTable.id }) },
    { table: "amy_decision_log", run: () => tx.delete(amyDecisionLogTable).where(eq(amyDecisionLogTable.userId, userId)).returning({ id: amyDecisionLogTable.id }) },
    { table: "amy_daily_briefings", run: () => tx.delete(amyDailyBriefingsTable).where(eq(amyDailyBriefingsTable.userId, userId)).returning({ id: amyDailyBriefingsTable.id }) },
    { table: "amy_knowledge_graph", run: () => tx.delete(amyKnowledgeGraphTable).where(eq(amyKnowledgeGraphTable.userId, userId)).returning({ id: amyKnowledgeGraphTable.id }) },
    { table: "amy_timeline_events_by_user", run: () => tx.delete(amyTimelineEventsTable).where(eq(amyTimelineEventsTable.userId, userId)).returning({ id: amyTimelineEventsTable.id }) },
    { table: "parent_hub_journey_by_user", run: () => tx.delete(parentHubJourneyTable).where(eq(parentHubJourneyTable.userId, userId)).returning({ id: parentHubJourneyTable.id }) },
    { table: "intervention_ledger_by_user", run: () => tx.delete(interventionLedgerTable).where(eq(interventionLedgerTable.userId, userId)).returning({ id: interventionLedgerTable.id }) },
    { table: "analytics_events_by_user", run: () => tx.delete(analyticsEventsTable).where(eq(analyticsEventsTable.userId, userId)).returning({ id: analyticsEventsTable.id }) },
    { table: "crash_events_by_user", run: () => tx.delete(crashEventsTable).where(eq(crashEventsTable.userId, userId)).returning({ id: crashEventsTable.id }) },
    { table: "infant_product_analytics_events_by_user", run: () => tx.delete(infantProductAnalyticsEventsTable).where(eq(infantProductAnalyticsEventsTable.userId, userId)).returning({ id: infantProductAnalyticsEventsTable.id }) },
    { table: "feature_notification_schedules_by_user", run: () => tx.delete(featureNotificationSchedulesTable).where(eq(featureNotificationSchedulesTable.userId, userId)).returning({ id: featureNotificationSchedulesTable.id }) },
    { table: "phonics_downloads_by_user", run: () => tx.delete(phonicsDownloadsTable).where(eq(phonicsDownloadsTable.userId, userId)).returning({ id: phonicsDownloadsTable.id }) },
    { table: "speech_expert_waitlist_by_user", run: () => tx.delete(speechExpertWaitlistTable).where(eq(speechExpertWaitlistTable.userId, userId)).returning({ id: speechExpertWaitlistTable.id }) },
    { table: "referrals", run: () => tx.delete(referralsTable).where(or(eq(referralsTable.referrerUserId, userId), eq(referralsTable.referredUserId, userId))).returning({ id: referralsTable.id }) },
    { table: "gift_tokens", run: () => tx.delete(giftTokensTable).where(or(eq(giftTokensTable.ownerUserId, userId), eq(giftTokensTable.recipientUserId, userId))).returning({ id: giftTokensTable.id }) },
    { table: "children", run: () => tx.delete(childrenTable).where(eq(childrenTable.userId, userId)).returning({ id: childrenTable.id }) },
  ];

  for (const { table, run } of userDeletes) {
    await countDeleted(tx, table, await run(), audit);
  }

  return childIds;
}

export function logDeletionAudit(params: {
  operation: "account" | "child";
  userId: string;
  childId?: number;
  childIds?: number[];
  audit: DeletionAuditEntry[];
  requestId?: string;
}): void {
  const totalRows = params.audit.reduce((sum, e) => sum + e.rows, 0);
  logger.info(
    {
      evt: "gdpr.deletion_audit",
      operation: params.operation,
      userId: params.userId,
      childId: params.childId,
      childIds: params.childIds,
      tables: params.audit,
      totalRowsDeleted: totalRows,
      requestId: params.requestId,
    },
    "GDPR data deletion completed",
  );
}
