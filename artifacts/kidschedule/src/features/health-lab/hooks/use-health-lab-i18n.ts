import { useTranslation } from "react-i18next";

/** Health Lab strings — keys under health_lab.* in locale files. */
export function useHealthLabI18n() {
  const { t, i18n } = useTranslation();
  return {
    t: (key: string, fallback?: string) => {
      const full = `health_lab.${key}`;
      const val = t(full);
      return val === full ? (fallback ?? key) : val;
    },
    lang: i18n.language,
  };
}
