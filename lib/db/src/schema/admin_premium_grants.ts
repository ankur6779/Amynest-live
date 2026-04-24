import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Manually-granted premium access, keyed by email address.
 * When a user authenticates and their email appears here, the subscription
 * service automatically upgrades them to active/yearly status on next
 * entitlement check (idempotent).
 */
export const adminPremiumGrantsTable = pgTable("admin_premium_grants", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  plan: text("plan").notNull().default("yearly"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});

export const insertAdminPremiumGrantSchema = createInsertSchema(adminPremiumGrantsTable).omit({
  id: true,
  grantedAt: true,
});
export type InsertAdminPremiumGrant = z.infer<typeof insertAdminPremiumGrantSchema>;
export type AdminPremiumGrant = typeof adminPremiumGrantsTable.$inferSelect;
