import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  type Auth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  setPersistence,
} from "firebase/auth";
import {
  canUseBrowserServiceWorkers,
  isNativeAmyNestShell,
} from "@/lib/native-shell";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;

// authDomain is set via VITE_FIREBASE_AUTH_DOMAIN.
const rawAuthDomain = import.meta.env
  .VITE_FIREBASE_AUTH_DOMAIN as string | undefined;

export const authDomain =
  rawAuthDomain && rawAuthDomain.includes(".")
    ? rawAuthDomain
    : `${projectId}.firebaseapp.com`;

export const currentHost =
  typeof window !== "undefined"
    ? window.location.hostname
    : "(ssr)";

export const firebaseProjectId = projectId;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  messagingSenderId: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string,
};

if (!config.apiKey || !config.projectId) {
  throw new Error(
    "Missing Firebase config. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, " +
      "VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_MESSAGING_SENDER_ID."
  );
}

export const firebaseApp: FirebaseApp =
  getApps()[0] ?? initializeApp(config);

function createFirebaseAuth(): Auth {
  const wantsIndexedDbPersistence = isNativeAmyNestShell();

  if (wantsIndexedDbPersistence) {
    try {
      return initializeAuth(firebaseApp, {
        persistence: indexedDBLocalPersistence,
      });
    } catch {
      // Hot reload or an earlier getAuth() call may have already initialized
      // Auth for this app instance. Fall through to the shared accessor.
    }
  }

  const auth = getAuth(firebaseApp);

  if (typeof window !== "undefined") {
    void setPersistence(
      auth,
      wantsIndexedDbPersistence
        ? indexedDBLocalPersistence
        : browserLocalPersistence
    ).catch(() => {});
  }

  return auth;
}

export const firebaseAuth: Auth = createFirebaseAuth();

/**
 * Foreground notification handler
 */
export async function setupForegroundNotifications(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (!canUseBrowserServiceWorkers()) return;
  if (Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const { getMessaging, onMessage } =
      await import("firebase/messaging");

    const messaging = getMessaging(firebaseApp);

    onMessage(messaging, (payload) => {
      const title =
        payload.notification?.title ?? "AmyNest";

      const body =
        payload.notification?.body ?? "";

      const data = (payload.data ?? {}) as Record<
        string,
        string
      >;

      const category = data.category ?? "amynest";
      const deepLink = data.deepLink ?? "/";

      navigator.serviceWorker.ready
        .then((reg) => {
          const opts = {
            body,
            icon: "/kidschedule/pwa-icon-192.png",
            badge: "/kidschedule/pwa-icon-192.png",
            tag: category,
            renotify: true,
            data: { ...data, deepLink },
          } as NotificationOptions;

          return reg.showNotification(title, opts);
        })
        .catch(() => {});
    });
  } catch {
    // Ignore unsupported environments
  }
}

/**
 * Requests an FCM web push token
 */
export async function getWebPushToken(
  vapidKey: string
): Promise<string> {
  if (!canUseBrowserServiceWorkers()) {
    console.log(
      "[FCM] Skipping web push registration outside browser SW environments"
    );

    return "";
  }

  const { getMessaging, getToken } =
    await import("firebase/messaging");

  const cleanKey = vapidKey
    .trim()
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  if (cleanKey.length < 80 || cleanKey.length > 92) {
    throw new Error(
      `VAPID key length looks wrong (${cleanKey.length} chars, expected ~87).`
    );
  }

  const basePath = (
    import.meta.env.BASE_URL as string
  ).replace(/\/$/, "");

  const swUrl = `${basePath}/firebase-messaging-sw.js`;

  const swReg =
    await navigator.serviceWorker.register(swUrl, {
      scope: `${basePath}/`,
      updateViaCache: "none",
    });

  swReg.update().catch(() => {});

  await navigator.serviceWorker.ready;

  const messaging = getMessaging(firebaseApp);

  const token = await getToken(messaging, {
    vapidKey: cleanKey,
    serviceWorkerRegistration: swReg,
  });

  if (!token) {
    throw new Error(
      "FCM returned an empty token — permission may be blocked."
    );
  }

  return token;
}