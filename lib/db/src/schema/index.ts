// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

export * from "./children";
export * from "./routines";
export * from "./behaviors";
export * from "./parent_profiles";
export * from "./babysitters";
export * from "./ai_cache";
export * from "./user_progress";
export * from "./onboarding";
export * from "./subscriptions";
export * from "./razorpay_webhook_events";
export * from "./referrals";
export * from "./user_coach_sessions";
export * from "./user_ai_messages";
export * from "./push_tokens";
export * from "./feature_feedback";
export * from "./custom_recipes";