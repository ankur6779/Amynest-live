import { getApiUrl } from "@/lib/api";

export type InfantNotifPrefs = {
  napReminders: boolean;
  feedReminders: boolean;
  vaccineReminders: boolean;
  milestoneTips: boolean;
  sleepDrift: boolean;
};

export type InfantNotifKind =
  | "nap_window"
  | "feed_reminder"
  | "vaccine_due"
  | "milestone_tip"
  | "sleep_drift";

export async function fetchInfantNotificationPrefs(
  childId: number,
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<InfantNotifPrefs & { maxPerDay: number; snoozeUntil: Record<string, string> }> {
  const res = await authFetch(getApiUrl(`/api/infant-notifications/prefs/${childId}`));
  if (!res.ok) throw new Error(`infant_notif_prefs_${res.status}`);
  const json = (await res.json()) as { prefs: InfantNotifPrefs & { maxPerDay: number; snoozeUntil: Record<string, string> } };
  return json.prefs;
}

export async function syncInfantNotificationPrefs(
  childId: number,
  prefs: Partial<InfantNotifPrefs & { maxPerDay: number }>,
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<void> {
  await authFetch(getApiUrl(`/api/infant-notifications/prefs/${childId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
}

export async function snoozeInfantNotification(
  childId: number,
  kind: InfantNotifKind,
  hours: 1 | 4 | 24,
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<void> {
  await authFetch(getApiUrl(`/api/infant-notifications/snooze/${childId}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, hours }),
  });
}

/** Best-effort infant notification outcome for analytics + adaptive engine. */
export function recordInfantNotificationOutcomeFireAndForget(payload: {
  action: "opened" | "dismissed" | "sent";
  kind?: string;
  childId?: number;
  dedupKey?: string;
}): void {
  void (async () => {
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(getApiUrl("/api/infant-notifications/outcome"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch {
      /* ignore */
    }
  })();
}
