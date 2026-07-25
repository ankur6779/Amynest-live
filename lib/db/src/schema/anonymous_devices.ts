import { index, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Push tokens for devices that installed the app but never signed in.
 * Linked to a user_id when the user completes registration.
 */
export const anonymousDevicesTable = pgTable(
  "anonymous_devices",
  {
    id: serial("id").primaryKey(),
    deviceId: text("device_id").notNull(),
    pushToken: text("push_token").notNull(),
    platform: text("platform").notNull().default("unknown"),
    deviceName: text("device_name"),
    locale: text("locale"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    installAt: timestamp("install_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    linkedUserId: text("linked_user_id"),
    linkedAt: timestamp("linked_at", { withTimezone: true }),
    uninstalledAt: timestamp("uninstalled_at", { withTimezone: true }),
  },
  (t) => ({
    deviceUnique: uniqueIndex("anonymous_devices_device_id_unique").on(t.deviceId),
    tokenUnique: uniqueIndex("anonymous_devices_push_token_unique").on(t.pushToken),
    unlinkedIdx: index("anonymous_devices_unlinked_idx").on(t.linkedUserId, t.uninstalledAt),
  }),
);

export type AnonymousDevice = typeof anonymousDevicesTable.$inferSelect;
export type InsertAnonymousDevice = typeof anonymousDevicesTable.$inferInsert;
