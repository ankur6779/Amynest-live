import type { Lang } from "@workspace/infant-hub";

/**
 * Map an i18next locale string to one of the three languages the
 * InfantHub localised content ships in: English, Hindi (Devanagari) or
 * Hinglish (Roman).
 *
 * Mirrors the helper originally defined inline in components/InfantHub.tsx
 * (kept there too for backwards compatibility). Pull from this util when
 * adding a new sub-component that needs to render `LocalizedText` fields
 * via `pickLang(field, lang)`.
 */
export function langOf(i18nLang: string | undefined): Lang {
  if (i18nLang?.startsWith("hi") && !i18nLang.includes("ng")) return "hi";
  if (i18nLang === "hinglish" || i18nLang?.startsWith("hin")) return "hin";
  return "en";
}
