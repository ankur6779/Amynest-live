import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * One active OTP challenge per email (upserted on each send).
 * Stores only a salted hash of the 6-digit code — never the plain OTP.
 */
export const emailOtpTable = pgTable(
  "email_otp_verifications",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    otpHash: text("otp_hash").notNull(),
    otpSalt: text("otp_salt").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index("email_otp_email_idx").on(t.email),
  }),
);

export const insertEmailOtpSchema = createInsertSchema(emailOtpTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailOtp = z.infer<typeof insertEmailOtpSchema>;
export type EmailOtpRow = typeof emailOtpTable.$inferSelect;
