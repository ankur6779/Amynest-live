import { boolean, index, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const userIdentityAliasesTable = pgTable(
  "user_identity_aliases",
  {
    id: serial("id").primaryKey(),
    /**
     * Compatibility internal identity. Today this is the canonical Firebase UID
     * that owns app data/subscription rows; future migrations can replace it
     * with a dedicated users.id without changing alias callers.
     */
    internalUserId: text("internal_user_id").notNull(),
    firebaseUid: text("firebase_uid").notNull(),
    email: text("email"),
    normalizedEmail: text("normalized_email"),
    provider: text("provider").notNull().default("unknown"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    firebaseUidUnique: uniqueIndex("user_identity_aliases_firebase_uid_uq").on(t.firebaseUid),
    internalUserIdx: index("user_identity_aliases_internal_user_idx").on(t.internalUserId),
    normalizedEmailIdx: index("user_identity_aliases_normalized_email_idx").on(t.normalizedEmail),
    emailVerifiedIdx: index("user_identity_aliases_email_verified_idx").on(t.normalizedEmail, t.emailVerified),
  }),
);

export type UserIdentityAlias = typeof userIdentityAliasesTable.$inferSelect;
