import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  type Auth,
} from "firebase/auth";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
      persistence: indexedDBLocalPersistence,
    });
  } else {
    // On native (iOS/Android), Firebase v12's package.json `react-native`
    // export condition resolves `firebase/auth` to its RN entry, which
    // exports `getReactNativePersistence`. Web bundles do NOT have it,
    // so we require it dynamically to keep web bundling working.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require("firebase/auth") as {
      getReactNativePersistence: (storage: unknown) => unknown;
    };
    _auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  }
} catch {
  _auth = getAuth(firebaseApp);
}
export const firebaseAuth: Auth = _auth;
