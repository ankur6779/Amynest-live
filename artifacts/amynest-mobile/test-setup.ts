import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./i18n/en.json";

/**
 * Global Firebase shim — prevents "auth/invalid-api-key" errors that occur
 * when @/lib/firebase.ts calls initializeAuth() at module-import time with
 * empty EXPO_PUBLIC_FIREBASE_* env vars in the test environment.
 *
 * Individual tests that need specific Firebase behaviour should add their own
 * vi.mock("@/lib/firebase", ...) override — it takes precedence over this.
 */
vi.mock("@/lib/firebase", () => ({
  firebaseApp: {},
  firebaseAuth: {
    currentUser: null,
    onIdTokenChanged: (_cb: unknown) => () => {},
    signOut: async () => {},
  },
}));

vi.mock("@/lib/firebase-auth", () => ({
  useAuth: () => ({
    user: null,
    fbUser: null,
    isLoaded: true,
    getToken: async () => null,
    signOut: async () => {},
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: {
      en: { translation: enTranslations },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    compatibilityJSON: "v4",
  });
}

vi.mock("@/i18n", () => ({
  default: i18next,
  setLanguage: async (code: string) => {
    await i18next.changeLanguage(code);
  },
  SUPPORTED_LANGUAGES: [
    { code: "en", label: "English", native: "English" },
  ],
}));
