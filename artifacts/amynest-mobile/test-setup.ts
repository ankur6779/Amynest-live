import "@testing-library/jest-dom";
import { vi } from "vitest";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./i18n/en.json";
import hiTranslations from "./i18n/hi.json";
import hinglishTranslations from "./i18n/hinglish.json";

// React Native ships a global `__DEV__` flag (set by Metro at bundle time)
// that the hub uses to gate dev-only debug overlays. Define it as `false`
// in the jsdom test environment so production-like rendering is exercised
// and the dev-only `HubDebugOverlay` stays out of the tree.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

// Initialise a real react-i18next instance backed by the same JSON bundles
// the production app ships. The app's own `@/i18n` module is mocked below
// (it pulls in `expo-localization` + AsyncStorage, neither of which we want
// to wire up in jsdom), but the i18next singleton it normally drives needs
// to exist so `useTranslation()` calls inside components return real
// translated strings rather than raw keys.
if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
      hinglish: { translation: hinglishTranslations },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "hi", "hinglish"],
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
    { code: "hi", label: "Hindi", native: "हिंदी" },
    { code: "hinglish", label: "Hinglish", native: "Hinglish" },
  ],
}));
