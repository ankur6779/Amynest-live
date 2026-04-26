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
 * Records every Coloring Book PDF download from the Google-Drive-backed
 * catalog. The unique (child_id, file_id) constraint enforces the
 * "never repeat" rule: a child can only download a given PDF once.
 *
 * Daily-quota enforcement (max N downloads per child per calendar day,
 * Asia/Kolkata) is calculated at query time against `downloaded_at`.
 */
export const coloringDownloadsTable = pgTable(
  "coloring_downloads",
  {
    id: serial("id").primaryKey(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** FK → children.id (serial integer). Required: a download is always
     *  attributed to a specific child so the "never repeat" rule works. */
    childId: integer("child_id").notNull(),
    /** Google Drive file ID. */
    fileId: text("file_id").notNull(),
    /** Cleaned display name at the time of download (in case the Drive
     *  file is renamed later we still know what the child got). */
    fileName: text("file_name").notNull(),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childFileUniq: uniqueIndex("coloring_downloads_child_file_uniq").on(
      t.childId,
      t.fileId,
    ),
    childIdx: index("coloring_downloads_child_idx").on(t.childId),
    userIdx: index("coloring_downloads_user_idx").on(t.userId),
    // Hot path: daily-quota count (`WHERE user_id=? AND child_id=? AND
    // downloaded_at::date = today`). Composite index keeps it cheap as
    // the table grows.
    dailyQuotaIdx: index("coloring_downloads_daily_quota_idx").on(
      t.userId,
      t.childId,
      t.downloadedAt,
    ),
  }),
);

export const insertColoringDownloadSchema = createInsertSchema(
  coloringDownloadsTable,
).omit({ id: true, downloadedAt: true });

export type ColoringDownloadRow = typeof coloringDownloadsTable.$inferSelect;
export type InsertColoringDownload = z.infer<
  typeof insertColoringDownloadSchema
>;
