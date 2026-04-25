import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/lib/firebase-auth";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useAuthFetch } from "@/hooks/useAuthFetch";

// expo-notifications remote push was removed from Expo Go in SDK 53.
// Only attempt to import + use it when running in a standalone/dev build.
// Constants.appOwnership is deprecated in SDK 49+ and unreliable in SDK 54
// (returns undefined in Expo Go), so use executionEnvironment instead.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo";
// Dynamic import only in non-Expo-Go environments to avoid the SDK 53 crash.
// Wrapped in try/catch as a final safety net — if the native module is missing
// for any reason (Expo Go, web, simulator without push), we degrade gracefully
// instead of crashing the JS bundle on boot.
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
 * Registers the device for Expo push notifications and uploads the resulting
 * token to the backend (POST /api/push/register). Idempotent — safe to mount
 * once at the root layout. Re-registers when the signed-in user changes so a
 * shared device routes notifications to the correct account.
 */
export function usePushRegistration(): void {
  const { isSignedIn, userId } = useAuth();
  const authFetch = useAuthFetch();
  // Dedupe key combines userId + token so account switches force a re-bind.
  const lastKeyRef = useRef<string | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isSignedIn || !userId) {
      // Clear dedupe so the next sign-in will re-register fresh.
      lastKeyRef.current = null;
      return;
    }
    // Push notifications are not available in Expo Go (SDK 53+). Skip silently.
    if (isExpoGo || !Notifications) return;
    if (!Device.isDevice) return;
    if (Platform.OS === "web") return;

    void (async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: "default",
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#7B3FF2",
          });
        }

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
        if (!granted || cancelled) return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
        const tokenResult = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const token = tokenResult.data;
        if (!token || cancelled) return;

        const key = `${userId}::${token}`;
        if (lastKeyRef.current === key) return;

        const platform =
          Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown";
        const deviceName = Device.deviceName ?? Device.modelName ?? null;

        const res = await authFetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, platform, deviceName }),
        });
        if (res.ok) {
          lastKeyRef.current = key;
          lastTokenRef.current = token;
        }
      } catch {
        // Best-effort; never crash the app.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, authFetch]);
}
