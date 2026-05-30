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

export const infantWellbeingCheckinsTable = pgTable(
  "infant_wellbeing_checkins",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    energy: integer("energy").notNull(),
    stress: integer("stress").notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childIdx: index("infant_wellbeing_checkins_child_idx").on(t.childId),
  }),
);

export const insertInfantWellbeingCheckinSchema = createInsertSchema(
  infantWellbeingCheckinsTable,
).omit({ id: true, createdAt: true });

export type InfantWellbeingCheckinRow =
  typeof infantWellbeingCheckinsTable.$inferSelect;
