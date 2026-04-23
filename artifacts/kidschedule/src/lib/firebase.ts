import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, browserLocalPersistence, setPersistence } from "firebase/auth";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;

// authDomain must be "<project-id>.firebaseapp.com" (or a custom domain).
// If the secret was accidentally set to the App ID value, derive it automatically.
const rawAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const authDomain =
  rawAuthDomain && rawAuthDomain.includes(".")
    ? rawAuthDomain
    : `${projectId}.firebaseapp.com`;
const currentHost = typeof window !== "undefined" ? window.location.hostname : "";

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

if (typeof window !== "undefined" && currentHost) {
  const allowedDomain = `${projectId}.firebaseapp.com`;
  if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
    console.info("Firebase current host:", currentHost, "authDomain:", allowedDomain);
  }
}
