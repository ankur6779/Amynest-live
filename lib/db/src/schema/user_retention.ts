import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type RetentionDailyGoals = {
  routine: boolean;
  story: boolean;
  activity: boolean;
  speech: boolean;
};

export type RetentionResumeItem = {
  type: "routine" | "story" | "learning" | "speech" | "worksheet" | "game";
  href: string;
  label: string;
  progressPct: number;
  updatedAt: string;
};

export type RetentionPreferences = {
  favoriteStories?: string[];
  favoriteGames?: string[];
  favoriteFoods?: string[];
  preferredBedtime?: string;
  preferredWakeTime?: string;
  preferredLearningCategory?: string;
};

export type WeeklySummaryCache = {
  weekKey: string;
  routineCompletionPct: number;
  learningMinutes: number;
  storiesCompleted: number;
  speechSessions: number;
  nutritionScore: number;
  parentingScore: number;
  generatedAt: string;
};

/** Unified habit / streak / goals state per parent account. */
export const userRetentionTable = pgTable(
  "user_retention",
  {
    userId: text("user_id").primaryKey(),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastActiveDate: date("last_active_date"),
    lastCheckinDate: date("last_checkin_date"),
    /** YYYY-MM when shield was last consumed. */
    shieldUsedMonth: text("shield_used_month"),
    totalStars: integer("total_stars").notNull().default(0),
    totalCoins: integer("total_coins").notNull().default(0),
    parentXp: integer("parent_xp").notNull().default(0),
    dailyGoals: jsonb("daily_goals")
      .$type<RetentionDailyGoals>()
      .notNull()
      .default({ routine: false, story: false, activity: false, speech: false }),
    goalsDate: date("goals_date"),
    achievements: jsonb("achievements").$type<string[]>().notNull().default([]),
    preferences: jsonb("preferences")
      .$type<RetentionPreferences>()
      .notNull()
      .default({}),
    resumeItems: jsonb("resume_items")
      .$type<RetentionResumeItem[]>()
      .notNull()
      .default([]),
    inactiveDays: integer("inactive_days").notNull().default(0),
    winbackLevel: integer("winback_level").notNull().default(0),
    weeklySummaryCache: jsonb("weekly_summary_cache").$type<WeeklySummaryCache | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("user_retention_user_idx").on(t.userId),
    lastActiveIdx: index("user_retention_last_active_idx").on(t.lastActiveDate),
  }),
);

export type UserRetention = typeof userRetentionTable.$inferSelect;
export type InsertUserRetention = typeof userRetentionTable.$inferInsert;
