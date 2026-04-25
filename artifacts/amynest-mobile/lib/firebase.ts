import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getReactNativePersistence } from "firebase/auth/react-native";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
};

if (!config.apiKey || !config.projectId) {
  console.warn(
    "[firebase] Missing EXPO_PUBLIC_FIREBASE_* env vars — auth will fail.",
  );
}

export const firebaseApp: FirebaseApp =
  getApps()[0] ?? initializeApp(config);

let _auth: Auth;
try {
  if (Platform.OS === "web") {
    _auth = initializeAuth(firebaseApp, {
      persistence: browserLocalPersistence,
    });
  } else {
    _auth = initializeAuth(firebaseApp, {
      persistence: initializeReactNativePersistence(AsyncStorage),
    });
  }
} catch {
  // initializeAuth throws if called twice (e.g. fast refresh) — fall back.
  _auth = getAuth(firebaseApp);
}
export const firebaseAuth: Auth = _auth;
