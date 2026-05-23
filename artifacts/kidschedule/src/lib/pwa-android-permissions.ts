/**
 * Android installed PWA (Chrome standalone) — web permission prompts.
 * Unlike the Play Store WebView wrapper, there is no native bridge; the OS
 * only shows dialogs after explicit user gestures (button taps).
 */

import {
  isAndroidInstalledPwa as isAndroidInstalledPwaClient,
} from "@/lib/device-lite";
import {
  getBrowserNotificationPermission,
  shouldShowNativeNotifyPrompt,
} from "@/lib/native-push-bridge";
import { canUseBrowserServiceWorkers } from "@/lib/native-shell";
import { checkGeoPermission } from "@/lib/onboarding-location";

const SKIP_UNTIL_KEY = "amynest_pwa_perm_skip_until_v1";

export type PermissionKind = "notifications" | "location" | "microphone";

export type PermissionSnapshot = {
  notifications: "granted" | "denied" | "default" | "unsupported";
  location: "granted" | "denied" | "prompt" | "unknown";
  microphone: "granted" | "denied" | "prompt" | "unknown";
};

/** Installed AmyNest PWA on Android (not Play WebView, not Capacitor). */
export function isAndroidInstalledPwa(): boolean {
  return isAndroidInstalledPwaClient();
}

function snoozeMs(days: number): number {
  return Date.now() + days * 86_400_000;
}

export function isPwaPermissionsSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(SKIP_UNTIL_KEY);
    if (!raw) return false;
    return Date.now() < parseInt(raw, 10);
  } catch {
    return false;
  }
}

export function snoozePwaPermissionsPrompt(days = 3): void {
  try {
    localStorage.setItem(SKIP_UNTIL_KEY, String(snoozeMs(days)));
  } catch {
    /* ignore */
  }
}

async function checkMicrophonePermission(): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> {
  if (typeof navigator === "undefined") return "unknown";
  if (!navigator.mediaDevices?.getUserMedia) return "unknown";

  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
      return "prompt";
    } catch {
      return "prompt";
    }
  }
  return "prompt";
}

export async function getAndroidPwaPermissionSnapshot(): Promise<PermissionSnapshot> {
  let notifications: PermissionSnapshot["notifications"] = "unsupported";
  if (canUseBrowserServiceWorkers() && "Notification" in window) {
    const perm = getBrowserNotificationPermission();
    notifications = perm ?? "default";
  }

  const location = await checkGeoPermission();
  const microphone = await checkMicrophonePermission();

  return { notifications, location, microphone };
}

export function snapshotNeedsPrompt(snap: PermissionSnapshot): boolean {
  if (
    canUseBrowserServiceWorkers() &&
    "Notification" in window &&
    snap.notifications === "default"
  ) {
    return true;
  }
  if (snap.location !== "granted" && snap.location !== "denied") return true;
  if (snap.microphone !== "granted" && snap.microphone !== "denied") return true;
  return false;
}

export async function needsAndroidPwaPermissionsSetup(): Promise<boolean> {
  if (!isAndroidInstalledPwa()) return false;
  if (isPwaPermissionsSnoozed()) return false;
  const snap = await getAndroidPwaPermissionSnapshot();
  return snapshotNeedsPrompt(snap);
}

export async function shouldShowPermissionsSetupPromptAsync(): Promise<boolean> {
  if (shouldShowNativeNotifyPrompt()) return true;
  return needsAndroidPwaPermissionsSetup();
}

async function requestWebPushPermission(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<void> {
  if (!canUseBrowserServiceWorkers() || !("Notification" in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) return;

  const { getWebPushToken, setupForegroundNotifications } = await import("@/lib/firebase");
  const token = await getWebPushToken(vapidKey);
  await authFetch("/api/push/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      platform: "web",
      deviceName: navigator.userAgent.slice(0, 100),
    }),
  });
  await setupForegroundNotifications();
}

async function requestLocationPermission(): Promise<void> {
  if (!navigator.geolocation) return;
  await new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(),
      () => resolve(),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}

async function requestMicrophonePermission(): Promise<void> {
  const { requestMicrophoneAccess } = await import("@/lib/microphone-permission");
  await requestMicrophoneAccess({ forFeature: false });
}

/**
 * Run inside a button click — Chrome Android PWA requires a user gesture.
 */
export async function requestAllAndroidPwaPermissions(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<PermissionSnapshot> {
  const snap = await getAndroidPwaPermissionSnapshot();

  if (snap.notifications === "default") {
    await requestWebPushPermission(authFetch);
  }

  if (snap.location !== "granted" && snap.location !== "denied") {
    await requestLocationPermission();
  }

  if (snap.microphone !== "granted" && snap.microphone !== "denied") {
    await requestMicrophonePermission();
  }

  return getAndroidPwaPermissionSnapshot();
}
