import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const I18N_DIR = path.resolve(__dirname, "../../../i18n");

function flatten(obj: unknown, prefix = "", out = new Set<string>()): Set<string> {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) out.add(prefix);
    return out;
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    flatten((obj as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function loadLocale(file: string) {
  return JSON.parse(fs.readFileSync(path.join(I18N_DIR, file), "utf8")) as Record<string, unknown>;
}

const REQUIRED_PREFIXES = [
  "nutrition_hub.nav",
  "nutrition_hub.track",
  "nutrition_hub.household",
  "nutrition_hub.operations",
  "nutrition_hub.achievements",
  "nutrition_hub.discovery",
  "nutrition_hub.monthly_review",
  "nutrition_hub.premium_preview",
  "nutrition_hub.intelligence",
  "nutrition_hub.score",
  "nutrition_share",
];

describe("nutrition localization completeness", () => {
  const en = loadLocale("en.json");
  const enKeys = flatten(en);

  for (const locale of ["hi.json", "hinglish.json"] as const) {
    it(`${locale} includes all nutrition_hub Sprint 6–7 keys`, () => {
      const loc = loadLocale(locale);
      const locKeys = flatten(loc);
      const required = [...enKeys].filter((k) =>
        REQUIRED_PREFIXES.some((p) => k === p || k.startsWith(`${p}.`)),
      );
      const missing = required.filter((k) => !locKeys.has(k));
      expect(missing, `missing in ${locale}`).toEqual([]);
    });
  }
});
