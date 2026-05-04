import type { Lang } from "@workspace/infant-hub";

/**
 * Map an i18next locale string to a supported Lang value.
 * The app is English-only; this always returns "en".
 */
export function langOf(_i18nLang: string | undefined): Lang {
  return "en";
}
