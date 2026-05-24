export type AbacusLang = "en" | "hi";

/** Map i18next locale to supported abacus tutor language. */
export function resolveAbacusLanguage(locale: string | undefined): AbacusLang {
  if (!locale) return "en";
  const base = locale.split("-")[0]?.toLowerCase();
  if (base === "hi") return "hi";
  return "en";
}
