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
 * Records every Printable Worksheet download from the Google-Drive-backed
 * catalog. The unique (child_id, file_id) constraint enables free no-charge
 * re-downloads while keeping first-time daily/lifetime quota enforcement
 * server-authoritative.
 */
export const worksheetDownloadsTable = pgTable(
  "worksheet_downloads",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id").notNull(),
    fileId: text("file_id").notNull(),
    fileName: text("file_name").notNull(),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childFileUniq: uniqueIndex("worksheet_downloads_child_file_uniq").on(
      t.childId,
      t.fileId,
    ),
    childIdx: index("worksheet_downloads_child_idx").on(t.childId),
    userIdx: index("worksheet_downloads_user_idx").on(t.userId),
    dailyQuotaIdx: index("worksheet_downloads_daily_quota_idx").on(
      t.userId,
      t.childId,
      t.downloadedAt,
    ),
  }),
);

export const insertWorksheetDownloadSchema = createInsertSchema(
  worksheetDownloadsTable,
).omit({ id: true, downloadedAt: true });

export type WorksheetDownloadRow = typeof worksheetDownloadsTable.$inferSelect;
export type InsertWorksheetDownload = z.infer<
  typeof insertWorksheetDownloadSchema
>;
