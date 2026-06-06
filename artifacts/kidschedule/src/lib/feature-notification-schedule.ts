/**
 * Register server-side feature reminder preferences (no client Notification API).
 */
import { getApiUrl } from "@/lib/api";

export type FeatureScheduleType = "event_prep" | "sleep_winddown";

export function hasPushRegistered(): boolean {
  try {
    return !!localStorage.getItem("notify_device_registered_at");
  } catch {
    return false;
  }
}

export async function upsertFeatureNotificationSchedule(
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
  input: {
    scheduleType: FeatureScheduleType;
    entityId: string;
    childId?: number;
    enabled: boolean;
    config?: Record<string, unknown>;
  },
): Promise<boolean> {
  try {
    const res = await authFetch(getApiUrl("/api/feature-notification-schedules"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateInfantNotificationPrefs(
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
  childId: number,
  patch: Record<string, boolean>,
): Promise<boolean> {
  try {
    const res = await authFetch(getApiUrl(`/api/infant-notifications/prefs/${childId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}
