import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type { LedgerEntry, PlayLogEntry, SkillRecord } from "@workspace/gaming-rewards";

/**
 * Per-user gaming rewards wallet (family-level points + unlocks).
 * Synced from Capacitor / web clients; server is source of truth when signed in.
 */
export const gamingWalletTable = pgTable(
  "gaming_wallet",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    pointsBalance: integer("points_balance").notNull().default(0),
    unlockedGames: jsonb("unlocked_games").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<SkillRecord>().notNull().default({}),
    playLog: jsonb("play_log").$type<PlayLogEntry[]>().notNull().default([]),
    ledger: jsonb("ledger").$type<LedgerEntry[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUq: uniqueIndex("gaming_wallet_user_uq").on(t.userId),
  }),
);

export const insertGamingWalletSchema = createInsertSchema(gamingWalletTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGamingWallet = z.infer<typeof insertGamingWalletSchema>;
export type GamingWallet = typeof gamingWalletTable.$inferSelect;
