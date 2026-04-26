import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Catalog of stories synced from the configured Google Drive folders.
 *
 * One row per Drive file. Sync is idempotent — we upsert on driveFileId so
 * a re-sync just refreshes title/category/thumbnail.
 *
 * Streaming is not stored here; clients call /api/reels/stream/:driveFileId
 * (the existing Drive proxy with range-request + virus-scan-token support).
 */
export const storyContentTable = pgTable(
  "story_content",
  {
    id: serial("id").primaryKey(),
    /** Google Drive file id — unique across both folders. */
    driveFileId: text("drive_file_id").notNull(),
    /** Cleaned, human-readable title (e.g. "Lion And Mouse"). */
    title: text("title").notNull(),
    /** Original file name (kept so we can re-derive title if rules change). */
    originalName: text("original_name").notNull(),
    /** Auto-classified bucket: bedtime | moral | fun | general */
    category: text("category").notNull().default("general"),
    /** MIME type from Drive (e.g. video/mp4). */
    mimeType: text("mime_type").notNull(),
    /** Drive thumbnailLink. May be null if Drive didn't generate one. */
    thumbnailUrl: text("thumbnail_url"),
    /** Source folder id — useful for analytics & re-sync targeting. */
    folderId: text("folder_id").notNull(),
    /** Optional duration in seconds, if available from Drive metadata. */
    durationSec: integer("duration_sec"),
    /** Soft-delete flag — clearing this hides a story from the hub. */
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("story_content_drive_file_id_uniq").on(table.driveFileId),
    index("story_content_active_idx").on(table.active),
    index("story_content_category_idx").on(table.category),
  ],
);

export const storyContentInsertSchema = createInsertSchema(storyContentTable);
export type StoryContent = typeof storyContentTable.$inferSelect;
export type NewStoryContent = typeof storyContentTable.$inferInsert;
export type StoryContentInsert = z.infer<typeof storyContentInsertSchema>;
