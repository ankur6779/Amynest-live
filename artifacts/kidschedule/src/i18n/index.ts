import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export function setLanguage(_code: LanguageCode) {
  // no-op: app is English-only
}

export default i18n;
