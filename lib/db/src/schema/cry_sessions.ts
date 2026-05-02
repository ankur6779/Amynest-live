import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Cry Insight (Beta) — one row per analysed cry session.
 *
 * Audio waveforms are NEVER stored: only derived features (`audioStats`)
 * and parent-supplied context. This keeps the table tiny and respects
 * privacy — raw audio stays on the device that recorded it.
 *
 * `primaryCause` / `secondaryCause` are the top-2 ranked causes from the
 * classifier. Confidences are 0–100 integers (so they can be rendered as
 * percentages with no float drift).
 */
export const crySessionsTable = pgTable(
  "cry_sessions",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    /** Length of the analysed clip in ms (0 = no audio, context-only). */
    durationMs: integer("duration_ms").notNull().default(0),
    /** Client-computed audio features: avgAmplitude, peakAmplitude, zeroCrossingRate, etc. */
    audioStats: jsonb("audio_stats")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    /** Parent-supplied context snapshot (feed/sleep/diaper/temp/age). */
    context: jsonb("context")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** "hunger" | "sleepy" | "discomfort" | "pain". */
    primaryCause: text("primary_cause").notNull(),
    /** 0–100 integer percent confidence in the primary cause. */
    primaryConfidence: integer("primary_confidence").notNull(),
    /** Optional second-best cause (may equal primary if only one fired). */
    secondaryCause: text("secondary_cause").notNull().default(""),
    secondaryConfidence: integer("secondary_confidence").notNull().default(0),
    /** Short parent-friendly action (e.g. "Try feeding"). */
    suggestion: text("suggestion").notNull().default(""),
    /** True when audio + context together look concerning enough to flag medical follow-up. */
    medicalFlag: integer("medical_flag").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childIdx: index("cry_sessions_child_idx").on(t.childId),
    userIdx: index("cry_sessions_user_idx").on(t.userId),
    childCreatedIdx: index("cry_sessions_child_created_idx").on(
      t.childId,
      t.createdAt,
    ),
  }),
);

export const insertCrySessionSchema = createInsertSchema(crySessionsTable).omit({
  id: true,
  createdAt: true,
});

export type CrySessionRow = typeof crySessionsTable.$inferSelect;
export type InsertCrySession = z.infer<typeof insertCrySessionSchema>;
