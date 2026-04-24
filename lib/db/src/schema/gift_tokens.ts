import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Gift tokens earned by paid referrers.
 *
 * When a premium user earns a referral milestone, they receive a gift token
 * (rather than bonus days which would be redundant — they're already premium).
 * They can share the gift code with any friend, who redeems it to get
 * `bonusDays` days of free premium.
 *
 * status:
 *   "available" — created, not yet redeemed
 *   "redeemed"  — a recipient has claimed it
 *   "expired"   — expiresAt has passed without redemption
 */
export const giftTokensTable = pgTable(
  "gift_tokens",
  {
    id: serial("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    giftCode: text("gift_code").notNull(),
    recipientUserId: text("recipient_user_id"),
    bonusDays: integer("bonus_days").notNull().default(30),
    status: text("status").notNull().default("available"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  },
  (t) => ({
    ownerIdx: index("gift_tokens_owner_idx").on(t.ownerUserId),
    codeUq: uniqueIndex("gift_tokens_code_uq").on(t.giftCode),
  }),
);

export type GiftToken = typeof giftTokensTable.$inferSelect;
export type InsertGiftToken = typeof giftTokensTable.$inferInsert;
