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
 * Records every Fun Sheet PDF download from the Google-Drive-backed
 * catalog. The unique (child_id, file_id) constraint enforces the
 * "never repeat" rule: a child can only download a given PDF once.
 *
 * Daily-quota enforcement (max 2 downloads per child per calendar day,
 * Asia/Kolkata) is calculated at query time against `downloaded_at`.
 */
export const funsheetDownloadsTable = pgTable(
  "funsheet_downloads",
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
    childFileUniq: uniqueIndex("funsheet_downloads_child_file_uniq").on(
      t.childId,
      t.fileId,
    ),
    childIdx: index("funsheet_downloads_child_idx").on(t.childId),
    userIdx: index("funsheet_downloads_user_idx").on(t.userId),
    dailyQuotaIdx: index("funsheet_downloads_daily_quota_idx").on(
      t.userId,
      t.childId,
      t.downloadedAt,
    ),
  }),
);

export const insertFunsheetDownloadSchema = createInsertSchema(
  funsheetDownloadsTable,
).omit({ id: true, downloadedAt: true });

export type FunsheetDownloadRow = typeof funsheetDownloadsTable.$inferSelect;
export type InsertFunsheetDownload = z.infer<
  typeof insertFunsheetDownloadSchema
>;
