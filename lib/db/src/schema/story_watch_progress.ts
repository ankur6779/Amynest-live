import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { childrenTable } from "./children";
import { storyContentTable } from "./story_content";

/**
 * Per-child watch progress for a story.
 *
 * `userId` is denormalised so the read path can authorise without a join
 * to children. One row per (childId, storyId) — `position_sec` is the
 * resume point, `play_count` increments each time a fresh play starts
 * (i.e. user re-opens after closing or completing).
 */
export const storyWatchProgressTable = pgTable(
  "story_watch_progress",
  {
    id: serial("id").primaryKey(),
    /** FK → children.id (serial integer). Cascades on child deletion. */
    childId: integer("child_id")
      .notNull()
      .references(() => childrenTable.id, { onDelete: "cascade" }),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** FK → story_content.id. Cascades on story removal. */
    storyId: integer("story_id")
      .notNull()
      .references(() => storyContentTable.id, { onDelete: "cascade" }),
    /** Resume point in seconds. 0 = haven't started / has been reset. */
    positionSec: integer("position_sec").notNull().default(0),
    /** Total duration in seconds (from the player). May lag the catalog. */
    durationSec: integer("duration_sec"),
    /** How many distinct play sessions this child has had with this story. */
    playCount: integer("play_count").notNull().default(0),
    /** True if the player reached ≥95% of duration at least once. */
    completed: boolean("completed").notNull().default(false),
    lastWatchedAt: timestamp("last_watched_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("story_watch_child_story_uniq").on(table.childId, table.storyId),
    index("story_watch_user_idx").on(table.userId),
    index("story_watch_last_watched_idx").on(table.lastWatchedAt),
  ],
);

export const storyWatchProgressInsertSchema = createInsertSchema(
  storyWatchProgressTable,
);
export type StoryWatchProgress = typeof storyWatchProgressTable.$inferSelect;
export type NewStoryWatchProgress = typeof storyWatchProgressTable.$inferInsert;
export type StoryWatchProgressInsert = z.infer<
  typeof storyWatchProgressInsertSchema
>;
