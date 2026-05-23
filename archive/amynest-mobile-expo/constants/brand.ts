/**
 * Brand string constants for AmyNest.
 *
 * The canonical values live in `constants/brand.json` so that both this
 * TypeScript module and plain CommonJS scripts (e.g. scripts/translate-i18n.js)
 * can read from a single source of truth without any build step.
 *
 * These values are proper nouns / brand identifiers and are intentionally
 * NOT wrapped in t() — they must never be translated.  Centralising them
 * here makes that decision explicit and keeps the i18n audit green without
 * requiring per-line suppression comments.
 */

import _brand from "./brand.json";

export const BRAND = _brand as {
  readonly appName: string;
  readonly aiName: string;
  /** accessibilityLabel for the logo image / pressable in the app shell. */
  readonly logoA11yLabel: string;
};
