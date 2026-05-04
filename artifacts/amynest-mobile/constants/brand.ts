/**
 * Brand string constants for AmyNest.
 *
 * These values are proper nouns / brand identifiers and are intentionally
 * NOT wrapped in t() — they must never be translated.  Centralising them
 * here makes that decision explicit and keeps the i18n audit green without
 * requiring per-line suppression comments.
 */

export const BRAND = {
  appName: "AmyNest",
  aiName: "Amy",

  /** accessibilityLabel for the logo image / pressable in the app shell. */
  logoA11yLabel: "AmyNest logo",
} as const;
