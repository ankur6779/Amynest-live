import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";

// expo-notifications was removed from Expo Go in SDK 53. Mirror the dynamic
// require pattern used by usePushRegistration so this module never crashes
// the JS bundle in Expo Go / web / simulator without push support.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo";

let Notifications: typeof import("expo-notifications") | null = null;
if (!isExpoGo && Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    Notifications = null;
  }
}

export const NOTIF_ENABLED_KEY = (routineId: number | string): string =>
  `amynest:notif-enabled:${routineId}`;
const NOTIF_IDS_KEY = (routineId: number | string): string =>
  `amynest:notif-ids:${routineId}`;

export type NotifSchedItem = {
  time: string; // "7:00 AM"
  activity: string;
  status?: string;
};

/** Returns true when the platform can schedule local task reminders. */
export function notificationsAvailable(): boolean {
  return Notifications !== null;
}

function parseTime(t: string): { h: number; m: number } | null {
  const m = t?.replace(/\s+/g, " ").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const mn = parseInt(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { h, m: mn };
}

/** Build a Date for a given routine date + clock time, 5 minutes earlier. */
function reminderDate(dateISO: string, time: string): Date | null {
  const t = parseTime(time);
  if (!t) return null;
  const d = new Date(`${dateISO}T00:00:00`);
  d.setHours(t.h, t.m - 5, 0, 0); // fire 5 min before
  return d;
}

export async function isNotificationsEnabled(routineId: number | string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(NOTIF_ENABLED_KEY(routineId));
    return v === "1";
  } catch {
    return false;
  }
}

/**
 * Request permission. Returns true on grant. Honours iOS PROVISIONAL.
 * No-op (returns false) when expo-notifications isn't loadable.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted =
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted =
        req.granted ||
        req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }
    return !!granted;
  } catch {
    return false;
  }
}

/**
 * Schedule a local reminder for every pending item. Past items are skipped.
 * Returns the list of scheduled notification ids (stored so we can cancel).
 */
export async function scheduleRoutineReminders(
  routineId: number | string,
  routineDateISO: string,
  items: NotifSchedItem[],
): Promise<string[]> {
  if (!Notifications) return [];
  await cancelRoutineReminders(routineId); // wipe any stale schedule first

  const ids: string[] = [];
  const now = Date.now();

  for (const item of items) {
    if (item.status && item.status !== "pending") continue;
    const fireAt = reminderDate(routineDateISO, item.time);
    if (!fireAt || fireAt.getTime() <= now + 30 * 1000) continue; // >30s out

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${item.activity}`,
          body: `Coming up at ${item.time} — get ready!`,
          sound: "default",
        },
        trigger: { type: "date", date: fireAt } as never,
      });
      ids.push(id);
    } catch {
      // Best-effort. If one trigger fails, keep going.
    }
  }

  await AsyncStorage.setItem(NOTIF_IDS_KEY(routineId), JSON.stringify(ids));
  await AsyncStorage.setItem(NOTIF_ENABLED_KEY(routineId), "1");
  return ids;
}

export async function cancelRoutineReminders(routineId: number | string): Promise<void> {
  if (!Notifications) return;
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY(routineId));
    if (raw) {
      const ids = JSON.parse(raw) as string[];
      for (const id of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  await AsyncStorage.removeItem(NOTIF_IDS_KEY(routineId));
  await AsyncStorage.setItem(NOTIF_ENABLED_KEY(routineId), "0");
}
