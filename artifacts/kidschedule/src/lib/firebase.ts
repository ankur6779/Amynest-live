import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, browserLocalPersistence, setPersistence } from "firebase/auth";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;

// authDomain is set via VITE_FIREBASE_AUTH_DOMAIN (e.g. "amynest.in").
// Firebase Hosting must serve /__/auth/handler at that domain.
// Falls back to the default Firebase domain if the env var is missing or invalid.
const rawAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
export const authDomain =
  rawAuthDomain && rawAuthDomain.includes(".")
    ? rawAuthDomain
    : `${projectId}.firebaseapp.com`;

export const currentHost =
  typeof window !== "undefined" ? window.location.hostname : "(ssr)";
export const firebaseProjectId = projectId;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
};

if (!config.apiKey || !config.projectId) {
  throw new Error(
    "Missing Firebase config. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, " +
      "VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_MESSAGING_SENDER_ID.",
  );
}

export const firebaseApp: FirebaseApp =
  getApps()[0] ?? initializeApp(config);
export const firebaseAuth: Auth = getAuth(firebaseApp);

// Persist sessions across page reloads.
void setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {});

/**
 * Requests an FCM web push token.
 * Registers the Firebase Messaging service worker, then calls getToken().
 * Throws if permission is not granted or if the VAPID key is missing.
 *
 * Key behaviours:
 *  - updateViaCache:"none" forces the browser to check for a new SW on every
 *    call, so users always pick up the updated SW after a re-deploy instead of
 *    staying on a stale version for days.
 *  - We wait for navigator.serviceWorker.ready before calling getToken() so
 *    FCM doesn't race against a SW that is still installing/activating.
 */
export async function getWebPushToken(vapidKey: string): Promise<string> {
  const { getMessaging, getToken } = await import("firebase/messaging");

  const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  const swUrl = `${basePath}/firebase-messaging-sw.js`;

  // Register (or update) the service worker.
  // updateViaCache: "none" → always fetch a fresh copy from the network so
  // users pick up new SW builds immediately after a deployment.
  const swReg = await navigator.serviceWorker.register(swUrl, {
    scope: `${basePath}/`,
    updateViaCache: "none",
  });

  // Trigger an update check synchronously so the browser downloads a new SW
  // if one is available. The update runs in the background; we don't await it
  // because the existing active SW is still good enough for this token fetch.
  swReg.update().catch(() => {});

  // Wait until a SW is active — required by FCM getToken().
  // After skipWaiting + clients.claim in the SW install/activate handlers,
  // this resolves quickly even right after a new deployment.
  await navigator.serviceWorker.ready;

  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg,
  });

  if (!token) {
    throw new Error("FCM returned an empty token — permission may be blocked.");
  }
  return token;
}
