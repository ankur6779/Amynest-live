import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Records every Phonics resource download (e.g. the Phonics Mastery PDF).
 * One row per download — users can download as many times as they like and
 * we keep the full history so parents/teachers can see download counts and
 * we have an audit trail.
 */
export const phonicsDownloadsTable = pgTable(
  "phonics_downloads",
  {
    id: serial("id").primaryKey(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** FK → children.id (serial integer). Optional: a parent may download
     *  without selecting a specific child. */
    childId: integer("child_id"),
    /** Stable identifier for the file being downloaded
     *  (e.g. "phonics-mastery-15-sets"). Lets us add more files later
     *  without changing the schema. */
    fileKey: text("file_key").notNull(),
    /** Original filename so we can show it in history if it ever changes. */
    fileName: text("file_name").notNull(),
    /** Optional client-reported user-agent for diagnostics. */
    userAgent: text("user_agent"),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("phonics_downloads_user_idx").on(t.userId),
    childIdx: index("phonics_downloads_child_idx").on(t.childId),
    fileIdx: index("phonics_downloads_file_idx").on(t.fileKey),
  }),
);

export const insertPhonicsDownloadSchema = createInsertSchema(
  phonicsDownloadsTable,
).omit({ id: true, downloadedAt: true });

export type PhonicsDownloadRow = typeof phonicsDownloadsTable.$inferSelect;
export type InsertPhonicsDownload = z.infer<typeof insertPhonicsDownloadSchema>;
