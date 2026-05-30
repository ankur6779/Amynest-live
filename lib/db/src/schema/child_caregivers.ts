import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const CHILD_CAREGIVER_ROLES = ["owner", "co_parent"] as const;
export const CHILD_CAREGIVER_STATUSES = ["active", "pending"] as const;

export type ChildCaregiverRole = (typeof CHILD_CAREGIVER_ROLES)[number];
export type ChildCaregiverStatus = (typeof CHILD_CAREGIVER_STATUSES)[number];

/** Links additional parents/caregivers to a child for shared infant logs. */
export const childCaregiversTable = pgTable(
  "child_caregivers",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("co_parent"),
    status: text("status").notNull().default("pending"),
    inviteCode: text("invite_code"),
    invitedByUserId: text("invited_by_user_id"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childUserUniq: uniqueIndex("child_caregivers_child_user_uniq").on(
      t.childId,
      t.userId,
    ),
    inviteCodeIdx: index("child_caregivers_invite_code_idx").on(t.inviteCode),
    childIdx: index("child_caregivers_child_idx").on(t.childId),
  }),
);

export const insertChildCaregiverSchema = createInsertSchema(
  childCaregiversTable,
).omit({ id: true, createdAt: true });

export type ChildCaregiverRow = typeof childCaregiversTable.$inferSelect;
