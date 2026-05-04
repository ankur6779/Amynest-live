import "@testing-library/jest-dom";
import { vi } from "vitest";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./i18n/en.json";

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
