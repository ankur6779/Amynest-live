import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "hinglish", label: "Hinglish", native: "Hinglish" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

const LANGUAGE_STORAGE_KEY = "amynest_language";
const loadedLanguages = new Set<LanguageCode>();

function normalizeLanguage(code: string | null | undefined): LanguageCode {
  if (code === "hi" || code === "hinglish") return code;
  return "en";
}

function getInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return "en";
  }
}

async function loadLanguageResource(code: LanguageCode): Promise<void> {
  if (loadedLanguages.has(code)) return;
  const mod =
    code === "hi"
      ? await import("./hi.json")
      : code === "hinglish"
        ? await import("./hinglish.json")
        : await import("./en.json");
  i18n.addResourceBundle(code, "translation", mod.default, true, true);
  loadedLanguages.add(code);
}

const initialLanguage = getInitialLanguage();
const i18nReady = i18n
  .use(initReactI18next)
  .init({
    resources: {},
    lng: initialLanguage,
    fallbackLng: "en",
    supportedLngs: ["en", "hi", "hinglish"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  .then(async () => {
    await loadLanguageResource(initialLanguage);
    await i18n.changeLanguage(initialLanguage);
  });

export async function setLanguage(code: LanguageCode): Promise<void> {
  const next = normalizeLanguage(code);
  await i18nReady;
  await loadLanguageResource(next);
  await i18n.changeLanguage(next);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      /* language persistence is best-effort */
    }
  }
}

export default i18n;
