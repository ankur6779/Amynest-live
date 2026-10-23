/**
 * Push token lifecycle across sign-out / account switch.
 *
 * FCM tokens are per install. If we leave User A's binding in `push_tokens`
 * after logout, transactional notifications (routine items, infant vaccine
 * copy with child names) keep landing on this device while User B is signed
 * in — especially on web/PWA where there is no native auto-rebind hook.
 */
import { getApiUrl } from "@/lib/api";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { canUseBrowserServiceWorkers } from "@/lib/native-shell";
import {
  getBrowserNotificationPermission,
  getNativePushBridge,
  getNativePushToken,
  isAmyNestWrapper,
} from "@/lib/native-push-bridge";

export const PUSH_REGISTERED_AT_KEY = "notify_device_registered_at";
export const PUSH_NUDGE_DISMISS_KEY = "notify_nudge_dismissed_until";

/** Drop local "already registered" markers so the next account can rebind. */
export function clearPushRegistrationMarkers(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PUSH_REGISTERED_AT_KEY);
    localStorage.removeItem(PUSH_NUDGE_DISMISS_KEY);
  } catch {
    /* private mode */
  }
}

async function collectLocalPushTokens(): Promise<string[]> {
  const tokens = new Set<string>();

  if (typeof window !== "undefined" && isAmyNestWrapper()) {
    try {
      const facade = getNativePushBridge();
      if (facade) {
        const nativeTok = await getNativePushToken(facade, 4_000);
        if (nativeTok) tokens.add(nativeTok);
      }
    } catch {
      /* best-effort */
    }
  }

  if (
    canUseBrowserServiceWorkers() &&
    getBrowserNotificationPermission() === "granted"
  ) {
    try {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
      if (vapidKey) {
        const { getWebPushToken } = await import("@/lib/firebase");
        const webTok = await getWebPushToken(vapidKey);
        if (webTok) tokens.add(webTok);
      }
    } catch {
      /* best-effort */
    }
  }

  return [...tokens];
}

/**
 * Best-effort: DELETE `/api/push/unregister` for every local FCM token while
 * the Firebase session is still valid. Sign-out continues even if this fails.
 */
export async function unregisterCurrentPushTokens(): Promise<void> {
  const { getFirebaseAuth } = await import("@/lib/firebase");
  const user = getFirebaseAuth().currentUser;
  if (!user) return;

  let authToken: string;
  try {
    authToken = await user.getIdToken();
  } catch {
    return;
  }
  if (!authToken) return;

  const tokens = await collectLocalPushTokens();
  if (tokens.length === 0) return;

  await Promise.all(
    tokens.map(async (token) => {
      try {
        await fetchWithTimeout(
          getApiUrl("/api/push/unregister"),
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          },
          4_000,
        );
      } catch (err) {
        console.warn("[push-session] unregister failed", err);
      }
    }),
  );
}
