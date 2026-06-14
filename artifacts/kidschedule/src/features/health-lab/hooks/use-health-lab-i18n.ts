import { useTranslation } from "react-i18next";

/** Health Lab strings — keys under health_lab.* in locale files. */
export function useHealthLabI18n() {
  const { t, i18n } = useTranslation();
  return {
    t: (key: string, fallback?: string, vars?: Record<string, string | number>) => {
      const full = `health_lab.${key}`;
      if (i18n.exists(full)) {
        return t(full, vars);
      }
      if (fallback && vars) {
        return Object.entries(vars).reduce(
          (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v)),
          fallback,
        );
      }
      return fallback ?? key;
    },
    lang: i18n.language,
  };
}
