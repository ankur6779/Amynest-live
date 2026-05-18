import { pgTable, text, integer, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const childrenTable = pgTable("children", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  dob: text("dob"),
  age: integer("age").notNull(),
  ageMonths: integer("age_months").notNull().default(0),
  isSchoolGoing: boolean("is_school_going"),
  childClass: text("child_class"),
  schoolStartTime: text("school_start_time").notNull(),
  schoolEndTime: text("school_end_time").notNull(),
  // Weekday numbers when this child has school. ISO format: 1=Mon … 7=Sun.
  // null = unknown (legacy rows) — treat as Mon-Fri at the application layer.
  // Empty array = explicitly no school days (e.g. extended break).
  schoolDays: jsonb("school_days").$type<number[]>(),
  wakeUpTime: text("wake_up_time").notNull().default("07:00"),
  sleepTime: text("sleep_time").notNull().default("21:00"),
  travelMode: text("travel_mode").notNull().default("car"),
  travelModeOther: text("travel_mode_other"),
  foodType: text("food_type").notNull().default("veg"),
  goals: text("goals").notNull(),
  babysitterId: integer("babysitter_id"),
  photoUrl: text("photo_url"),
  // Infant-only fields (captured during onboarding for children < 12 months).
  // Nullable for older children and legacy rows. Values mirror the keys used
  // on the mobile/web onboarding chat: feedingType ∈
  // {"breastfeeding","formula","mixed"}, sleepPattern ∈
  // {"flexible","irregular","short_naps"}.
  feedingType: text("feeding_type"),
  sleepPattern: text("sleep_pattern"),
  // Unified food-preference system (spec §2, §3).
  // If foodPrefInherited=true these fields mirror the parent's food_preferences;
  // when the parent customizes for a specific child they flip to false/true.
  dietType: text("diet_type"),
  foodStyle: text("food_style"),
  subCuisine: text("sub_cuisine"),
  allergies: text("allergies"),
  foodPrefInherited: boolean("food_pref_inherited").notNull().default(false),
  foodPrefCustomized: boolean("food_pref_customized").notNull().default(false),
  // Adaptive Family Intelligence — Phase 1
  // Structured parent-selected optimization goals. Codes:
  //   improve_sleep | reduce_tantrums | improve_focus | reduce_screen_time | increase_independence
  // Empty array / null = no explicit goals; routine uses general defaults.
  parentGoals: jsonb("parent_goals").$type<string[]>().default([]),
  // Derived energy profile recomputed from child_daily_signals + routine completion.
  // Shape: { peakFocusStart, peakFocusEnd, lowEnergyStart, lowEnergyEnd, calmWindowStart, calmWindowEnd, sampleCount, lastComputedAt }
  // Times are HH:mm strings. null fields = not enough data yet.
  energyProfile: jsonb("energy_profile").$type<{
    peakFocusStart: string | null;
    peakFocusEnd: string | null;
    lowEnergyStart: string | null;
    lowEnergyEnd: string | null;
    calmWindowStart: string | null;
    calmWindowEnd: string | null;
    sampleCount: number;
    lastComputedAt: string | null;
  }>(),
  /** Recurring locked activities (tuition, sports, classes) — see FixedActivity in OpenAPI. */
  fixedActivities: jsonb("fixed_activities")
    .$type<Array<{ activity: string; days: string[]; start: string; end: string }>>()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChildSchema = createInsertSchema(childrenTable).omit({ id: true, createdAt: true });
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof childrenTable.$inferSelect;
