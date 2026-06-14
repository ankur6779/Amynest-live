import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const userDevicesTable = pgTable(
  "user_devices",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    deviceId: text("device_id").notNull(),
    deviceName: text("device_name"),
    platform: text("platform").notNull().default("unknown"),
    browser: text("browser"),
    os: text("os"),
    appVersion: text("app_version"),
    lastIpHash: text("last_ip_hash"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    isActive: integer("is_active").notNull().default(1),
  },
  (t) => ({
    userDeviceIdx: uniqueIndex("user_devices_user_device_idx").on(t.userId, t.deviceId),
    userIdIdx: index("user_devices_user_id_idx").on(t.userId),
    activeUserIdx: index("user_devices_user_active_idx").on(t.userId, t.isActive),
  }),
);

export type UserDevice = typeof userDevicesTable.$inferSelect;
export type InsertUserDevice = typeof userDevicesTable.$inferInsert;
