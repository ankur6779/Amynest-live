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
import { firebaseWebDefaults } from "@/lib/firebase-web-defaults";
import { patchBootDiagnostics, recordBootError } from "@/lib/boot-store";

const FIREBASE_TAG = "[amynest:firebase]";

const projectId =
  (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() ||
  firebaseWebDefaults.projectId;

// authDomain is set via VITE_FIREBASE_AUTH_DOMAIN.
const rawAuthDomain = (
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined
)?.trim();

export const authDomain =
  rawAuthDomain && rawAuthDomain.includes(".")
    ? rawAuthDomain
    : firebaseWebDefaults.authDomain;

export const currentHost =
  typeof window !== "undefined"
    ? window.location.hostname
    : "(ssr)";

export const firebaseProjectId = projectId;

export const firebaseConfig = {
  apiKey:
    (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() ||
    firebaseWebDefaults.apiKey,
  authDomain,
  projectId,
  appId:
    (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim() ||
    firebaseWebDefaults.appId,
  messagingSenderId:
    (
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined
    )?.trim() || firebaseWebDefaults.messagingSenderId,
};

export type FirebaseInitResult =
  | { status: "pending" }
  | { status: "ok" }
  | { status: "fail"; error: string };

let firebaseAppInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let initResult: FirebaseInitResult = { status: "pending" };

function createFirebaseAuth(app: FirebaseApp): Auth {
  const wantsIndexedDbPersistence = isNativeAmyNestShell();

  if (wantsIndexedDbPersistence) {
    try {
      return initializeAuth(app, {
        persistence: indexedDBLocalPersistence,
      });
    } catch {
      /* Auth may already be initialized */
    }
  }

  const auth = getAuth(app);

  if (typeof window !== "undefined") {
    void setPersistence(
      auth,
      wantsIndexedDbPersistence
        ? indexedDBLocalPersistence
        : browserLocalPersistence,
    ).catch(() => {});
  }

  return auth;
}

/** Call once before any getFirebaseAuth() — never throws. */
export function initializeFirebase(): FirebaseInitResult {
  if (initResult.status !== "pending") return initResult;

  console.info(`${FIREBASE_TAG} init start`);
  patchBootDiagnostics({ firebaseStatus: "pending", firebaseError: null });

  try {
    firebaseAppInstance = getApps()[0] ?? initializeApp(firebaseConfig);
    if (getApps().length > 1) {
      console.warn(`${FIREBASE_TAG} multiple Firebase apps`, getApps().length);
    }
    authInstance = createFirebaseAuth(firebaseAppInstance);
    initResult = { status: "ok" };
    console.info(`${FIREBASE_TAG} init success`, {
      apps: getApps().length,
      projectId: firebaseConfig.projectId,
    });
    patchBootDiagnostics({ firebaseStatus: "ok", firebaseError: null });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    initResult = { status: "fail", error };
    console.error(`${FIREBASE_TAG} init fail`, err);
    patchBootDiagnostics({ firebaseStatus: "fail", firebaseError: error });
    recordBootError("firebase-init", err);
  }

  return initResult;
}

export function getFirebaseInitResult(): FirebaseInitResult {
  return initResult;
}

export function getFirebaseApp(): FirebaseApp {
  if (initResult.status !== "ok" || !firebaseAppInstance) {
    initializeFirebase();
  }
  if (!firebaseAppInstance) {
    throw new Error(
      initResult.status === "fail"
        ? initResult.error
        : "Firebase app is not initialized",
    );
  }
  return firebaseAppInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    getFirebaseApp();
  }
  if (!authInstance) {
    throw new Error("Firebase Auth is not initialized");
  }
  return authInstance;
}

/** Lazy proxy — does not initialize Firebase at module load. */
export const firebaseApp: FirebaseApp = new Proxy({} as FirebaseApp, {
  get(_target, prop) {
    const app = getFirebaseApp();
    const value = Reflect.get(app as object, prop, app);
    return typeof value === "function" ? (value as Function).bind(app) : value;
  },
});

/** Lazy proxy — does not initialize Firebase at module load. */
export const firebaseAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getFirebaseAuth();
    const value = Reflect.get(auth as object, prop, auth);
    return typeof value === "function" ? (value as Function).bind(auth) : value;
  },
});

export function isFirebaseAuthReady(): boolean {
  return initResult.status === "ok" && Boolean(authInstance);
}

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

  // Use the root AmyNest SW only. Registering firebase-messaging-sw.js at the
  // same scope used to replace sw.js and drop deploy/navigation handlers.
  const scope = `${basePath}/`;
  let swReg = await navigator.serviceWorker.getRegistration(scope);
  if (!swReg) {
    swReg = await navigator.serviceWorker.register(`${basePath}/sw.js`, {
      scope,
      updateViaCache: "none",
    });
  }
  await swReg.update().catch(() => {});
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