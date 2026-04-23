import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, browserLocalPersistence, setPersistence } from "firebase/auth";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;

// authDomain must be "<project-id>.firebaseapp.com" (or a custom domain with
// Firebase Hosting configured). If the secret is set to the App ID value
// (no dot), derive the standard auth domain automatically.
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
