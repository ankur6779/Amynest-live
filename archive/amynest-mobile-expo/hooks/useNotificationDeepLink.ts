import { useEffect } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import Constants, { ExecutionEnvironment } from "expo-constants";

// Constants.appOwnership is deprecated in SDK 49+ and unreliable in SDK 54
// (returns undefined in Expo Go), so use executionEnvironment instead.
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

/**
 * Routes a deepLink string to the right Expo Router path. Accepts the same
 * shorthand the server emits ("/hub", "/routine", "/meals", etc.). Falls back
 * to no-op for unknown destinations so we never crash on malformed payloads.
 */
// Strict allowlist of server-emitted deepLink values → Expo Router paths.
// Anything outside this map is ignored to prevent arbitrary navigation
// from a tampered notification payload.
const DEEP_LINK_MAP: Record<string, string> = {
  "/hub": "/(tabs)/hub",
  "/routine": "/(tabs)",
  "/meals": "/meals",
  "/insights": "/insights",
  "/progress": "/progress",
  "/rewards": "/rewards",
};

function safePush(router: ReturnType<typeof useRouter>, deepLink: unknown): void {
  if (typeof deepLink !== "string" || deepLink.length === 0) return;
  const target = DEEP_LINK_MAP[deepLink];
  if (!target) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (router as any).push(target);
  } catch {
    // Best effort.
  }
}

/**
 * Mounts the notification-tap listener at the root layout so taps from cold
 * launch (`getLastNotificationResponseAsync`) and from background
 * (`addNotificationResponseReceivedListener`) both deep-link into the app.
 */
export function useNotificationDeepLink(): void {
  const router = useRouter();

  useEffect(() => {
    if (isExpoGo || !Notifications) return;

    let cancelled = false;

    // Cold-start: resolve any notification that launched the app.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || !response) return;
      const data = response.notification.request.content.data as
        | { deepLink?: string }
        | undefined;
      safePush(router, data?.deepLink);
    });

    // Background → foreground tap.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { deepLink?: string }
        | undefined;
      safePush(router, data?.deepLink);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router]);
}
