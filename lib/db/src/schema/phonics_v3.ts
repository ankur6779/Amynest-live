import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  bigint,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type {
  PhonicsFluencyPayload,
  PhonicsMasteryPayload,
  PhonicsMissionPayload,
  PhonicsRetentionPayload,
  PhonicsStoryProgressPayload,
} from "@workspace/phonics-v3-progress";

export const phonicsV3MasteryTable = pgTable(
  "phonics_v3_mastery",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    payload: jsonb("payload").$type<PhonicsMasteryPayload>().notNull(),
    clientUpdatedAt: bigint("client_updated_at", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("phonics_v3_mastery_child_uq").on(t.childId),
    userIdx: index("phonics_v3_mastery_user_idx").on(t.userId),
  }),
);

export const phonicsV3FluencyTable = pgTable(
  "phonics_v3_fluency",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    payload: jsonb("payload").$type<PhonicsFluencyPayload>().notNull(),
    clientUpdatedAt: bigint("client_updated_at", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("phonics_v3_fluency_child_uq").on(t.childId),
    userIdx: index("phonics_v3_fluency_user_idx").on(t.userId),
  }),
);

export const phonicsV3StoryProgressTable = pgTable(
  "phonics_v3_story_progress",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    payload: jsonb("payload").$type<PhonicsStoryProgressPayload>().notNull(),
    clientUpdatedAt: bigint("client_updated_at", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("phonics_v3_story_progress_child_uq").on(t.childId),
    userIdx: index("phonics_v3_story_progress_user_idx").on(t.userId),
  }),
);

export const phonicsV3MissionsTable = pgTable(
  "phonics_v3_missions",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    payload: jsonb("payload").$type<PhonicsMissionPayload>().notNull(),
    clientUpdatedAt: bigint("client_updated_at", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("phonics_v3_missions_child_uq").on(t.childId),
    userIdx: index("phonics_v3_missions_user_idx").on(t.userId),
  }),
);

export const phonicsV3RetentionTable = pgTable(
  "phonics_v3_retention",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    payload: jsonb("payload").$type<PhonicsRetentionPayload>().notNull(),
    clientUpdatedAt: bigint("client_updated_at", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("phonics_v3_retention_child_uq").on(t.childId),
    userIdx: index("phonics_v3_retention_user_idx").on(t.userId),
  }),
);

export const insertPhonicsV3MasterySchema = createInsertSchema(phonicsV3MasteryTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PhonicsV3MasteryRow = typeof phonicsV3MasteryTable.$inferSelect;
export type PhonicsV3FluencyRow = typeof phonicsV3FluencyTable.$inferSelect;
export type PhonicsV3StoryProgressRow = typeof phonicsV3StoryProgressTable.$inferSelect;
export type PhonicsV3MissionsRow = typeof phonicsV3MissionsTable.$inferSelect;
export type PhonicsV3RetentionRow = typeof phonicsV3RetentionTable.$inferSelect;

export type InsertPhonicsV3Mastery = z.infer<typeof insertPhonicsV3MasterySchema>;
