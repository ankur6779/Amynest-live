import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Birth Sky committed entities (Phase 3 §5.1).
 * IM-1: profile + snapshot. Soft-delete via deletedAt.
 */

export const birthProfilesTable = pgTable(
  "birth_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id").notNull(),
    birthDate: text("birth_date").notNull(),
    birthTime: text("birth_time"),
    timePrecision: text("time_precision").notNull(),
    /**
     * Plain place object OR AES-GCM envelope `{ __bsenc: "bsenc/v1", v }` (RC1).
     * Application layer seals/unseals — never expose ciphertext to clients.
     */
    birthPlace: jsonb("birth_place").$type<
      | {
          label: string;
          lat: number;
          lon: number;
          timezoneIana?: string | null;
          country?: string | null;
          adminRegion?: string | null;
        }
      | { __bsenc: "bsenc/v1"; v: string }
      | null
    >(),
    consent: jsonb("consent")
      .$type<{
        consentVersion: string;
        acceptedAt: string;
        scopes: string[];
        disclaimerAccepted: true;
        childId: number;
      }>()
      .notNull(),
    /** Pack 2 AI: successful free insights consumed (server authoritative). */
    aiInsightsUsedCount: integer("ai_insights_used_count").notNull().default(0),
    /** Pack 7 Addendum A — privacy/legal policy version last accepted. */
    privacyPolicyVersion: text("privacy_policy_version"),
    privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    userChildIdx: uniqueIndex("birth_profiles_user_child_uidx").on(t.userId, t.childId),
    userIdx: index("birth_profiles_user_idx").on(t.userId),
  }),
);

/** Pack 7 preferences — server mirror; LWW by updatedAt. */
export const birthSkyPreferencesTable = pgTable(
  "birth_sky_preferences",
  {
    userId: text("user_id").primaryKey(),
    showTradition: boolean("show_tradition").notNull().default(true),
    skySounds: boolean("sky_sounds").notNull().default(false),
    monthlyNotesOptIn: boolean("monthly_notes_opt_in").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const skySnapshotsTable = pgTable(
  "sky_snapshots",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull(),
    userId: text("user_id").notNull(),
    cacheKey: text("cache_key").notNull(),
    snapshotVersion: text("snapshot_version").notNull(),
    engineVersion: text("engine_version").notNull(),
    mode: text("mode").notNull(),
    astronomy: jsonb("astronomy").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    profileCurrentIdx: index("sky_snapshots_profile_current_idx").on(t.profileId, t.isCurrent),
    userIdx: index("sky_snapshots_user_idx").on(t.userId),
  }),
);

/**
 * Birth Sky AI conversations (Pack 6). Messages are append-only — never edit body.
 */
export const birthSkyConversationsTable = pgTable(
  "birth_sky_conversations",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull(),
    userId: text("user_id").notNull(),
    snapshotVersion: text("snapshot_version").notNull(),
    engineVersion: text("engine_version").notNull(),
    entryPoint: text("entry_point").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    profileIdx: index("birth_sky_conversations_profile_idx").on(t.profileId),
    userIdx: index("birth_sky_conversations_user_idx").on(t.userId),
  }),
);

export const birthSkyMessagesTable = pgTable(
  "birth_sky_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    profileId: text("profile_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    /** Immutable after insert. */
    body: text("body").notNull(),
    sequence: integer("sequence").notNull(),
    jobId: text("job_id"),
    deliveryId: text("delivery_id"),
    modelVersion: text("model_version"),
    contextSchemaVersion: text("context_schema_version"),
    snapshotVersion: text("snapshot_version"),
    engineVersion: text("engine_version"),
    status: text("status").notNull().default("complete"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    convSeqIdx: uniqueIndex("birth_sky_messages_conv_seq_uidx").on(
      t.conversationId,
      t.sequence,
    ),
    conversationIdx: index("birth_sky_messages_conversation_idx").on(t.conversationId),
  }),
);

/** Exactly-once free-insight consumption keyed by deliveryId (Pack 2 Addendum B). */
export const birthSkyAiDeliveriesTable = pgTable(
  "birth_sky_ai_deliveries",
  {
    deliveryId: text("delivery_id").primaryKey(),
    profileId: text("profile_id").notNull(),
    userId: text("user_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    jobId: text("job_id").notNull(),
    consumedFreeInsight: boolean("consumed_free_insight").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    profileIdx: index("birth_sky_ai_deliveries_profile_idx").on(t.profileId),
  }),
);

export type BirthProfileRow = typeof birthProfilesTable.$inferSelect;
export type SkySnapshotRow = typeof skySnapshotsTable.$inferSelect;
export type BirthSkyConversationRow = typeof birthSkyConversationsTable.$inferSelect;
export type BirthSkyMessageRow = typeof birthSkyMessagesTable.$inferSelect;
