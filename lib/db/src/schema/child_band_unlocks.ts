import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Records every Parent-Hub age band that has been "unlocked" for a child —
 * either automatically by their date-of-birth crossing into a band
 * (`source = "auto_dob"`) or by reaching the early-unlock threshold
 * (≥75 % of the current band's tagged media completed,
 * `source = "early_completion"`).
 *
 * Once a row exists for a given (child_id, age_band) it is **never deleted**:
 * un-marking items afterwards must not silently revoke the unlock. The
 * `previewOnly` resolver in the hub-content endpoint OR-merges the rows
 * here with the DOB-derived band set, so either path is sufficient to
 * promote an item out of preview-only state.
 *
 * `userId` is denormalised so the read path can authorise without joining
 * to `children`, matching the pattern used by `phonics_progress` and
 * `story_watch_progress`.
 */
export const childBandUnlocksTable = pgTable(
  "child_band_unlocks",
  {
    id: serial("id").primaryKey(),
    /** FK → children.id (serial integer). */
    childId: integer("child_id").notNull(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** Age band — "0-2" | "2-4" | "4-6" | "6-8" | "8-10" | "10-12" | "12-15". */
    ageBand: text("age_band").notNull(),
    /** Why the band was unlocked: "auto_dob" | "early_completion". */
    source: text("source").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // One row per (child, band) — upserts are idempotent and irreversible.
    childBandUq: uniqueIndex("child_band_unlocks_child_band_uq").on(
      t.childId,
      t.ageBand,
    ),
    childIdx: index("child_band_unlocks_child_idx").on(t.childId),
    userIdx: index("child_band_unlocks_user_idx").on(t.userId),
  }),
);

export const insertChildBandUnlockSchema = createInsertSchema(
  childBandUnlocksTable,
).omit({ id: true, createdAt: true });

export type ChildBandUnlockRow = typeof childBandUnlocksTable.$inferSelect;
export type InsertChildBandUnlock = z.infer<typeof insertChildBandUnlockSchema>;
