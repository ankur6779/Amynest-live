import {
  pgTable,
  text,
  integer,
  serial,
  timestamp,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Daily speech time usage per child for Speech Coach V2 (10 min hard cap). */
export const speechCoachV2DailyUsageTable = pgTable("speech_coach_v2_daily_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  day: text("day").notNull(),
  secondsUsed: integer("seconds_used").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Completed Speech Coach V2 sessions with aggregated scores. */
export const speechCoachV2SessionsTable = pgTable("speech_coach_v2_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  ageBand: text("age_band").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  wordsSpoken: integer("words_spoken").notNull().default(0),
  sentencesCompleted: integer("sentences_completed").notNull().default(0),
  starsEarned: integer("stars_earned").notNull().default(0),
  pointsEarned: integer("points_earned").notNull().default(0),
  averageOverallScore: real("average_overall_score").notNull().default(0),
  averageAccuracy: real("average_accuracy").notNull().default(0),
  averageFluency: real("average_fluency").notNull().default(0),
  averageConfidence: real("average_confidence").notNull().default(0),
  completionRate: real("completion_rate").notNull().default(0),
  badgesEarned: jsonb("badges_earned").$type<string[]>().notNull().default([]),
  phaseReached: text("phase_reached").notNull(),
  scoresJson: jsonb("scores_json").$type<unknown[]>().notNull().default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-turn evaluation samples for trend analytics. */
export const speechCoachV2TurnLogTable = pgTable("speech_coach_v2_turn_log", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  exerciseId: text("exercise_id"),
  expected: text("expected").notNull(),
  transcript: text("transcript").notNull(),
  accuracyScore: integer("accuracy_score").notNull(),
  fluencyScore: integer("fluency_score").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  completionScore: integer("completion_score").notNull(),
  overallScore: integer("overall_score").notNull(),
  rawTranscript: text("raw_transcript"),
  transcriptAccuracy: integer("transcript_accuracy"),
  pronunciationEstimate: integer("pronunciation_estimate"),
  scoringConfidence: text("scoring_confidence"),
  speakingRateScore: integer("speaking_rate_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Streak tracking for gamification. */
export const speechCoachV2StreaksTable = pgTable("speech_coach_v2_streaks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  dailyStreak: integer("daily_streak").notNull().default(0),
  weeklyStreak: integer("weekly_streak").notNull().default(0),
  lastPracticeDay: text("last_practice_day"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Server-authoritative active Realtime session registry. */
export const speechCoachV2ActiveSessionsTable = pgTable("speech_coach_v2_active_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  secondsConsumed: integer("seconds_consumed").notNull().default(0),
  status: text("status").notNull().default("active"),
  ageBand: text("age_band").notNull(),
  sessionStateJson: jsonb("session_state_json").notNull().default({}),
  tabLockToken: text("tab_lock_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Monthly usage cap per child. */
export const speechCoachV2MonthlyUsageTable = pgTable("speech_coach_v2_monthly_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  month: text("month").notNull(),
  secondsUsed: integer("seconds_used").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpeechCoachV2DailyUsageSchema = createInsertSchema(
  speechCoachV2DailyUsageTable,
).omit({ id: true, updatedAt: true });

export const insertSpeechCoachV2SessionSchema = createInsertSchema(
  speechCoachV2SessionsTable,
).omit({ id: true, completedAt: true });

export type InsertSpeechCoachV2DailyUsage = z.infer<
  typeof insertSpeechCoachV2DailyUsageSchema
>;
export type SpeechCoachV2DailyUsageRow = typeof speechCoachV2DailyUsageTable.$inferSelect;
export type InsertSpeechCoachV2Session = z.infer<typeof insertSpeechCoachV2SessionSchema>;
export type SpeechCoachV2SessionRow = typeof speechCoachV2SessionsTable.$inferSelect;
