import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  abacusTranslate,
  resolveAbacusI18nKey,
  ABACUS_I18N_DEFAULTS,
  type AbacusTranslateFn,
} from "./i18n.ts";

describe("abacus i18n", () => {
  it("resolves shorthand keys to screens.abacus", () => {
    assert.equal(resolveAbacusI18nKey("abacus.step"), "screens.abacus.step");
    assert.equal(resolveAbacusI18nKey("screens.abacus.step"), "screens.abacus.step");
  });

  it("uses JSON value when present", () => {
    const resources: Record<string, string> = {
      "screens.abacus.step": "Step",
      "screens.abacus.weekly_leaderboard": "Weekly Leaderboard",
    };
    const t: AbacusTranslateFn = (key, def) =>
      resources[String(key)] ?? (typeof def === "string" ? def : "");
    assert.equal(abacusTranslate(t, "abacus.step"), "Step");
    assert.equal(abacusTranslate(t, "abacus.weekly_leaderboard"), "Weekly Leaderboard");
  });

  it("falls back when key missing from resources", () => {
    const t: AbacusTranslateFn = (_key, def) => (typeof def === "string" ? def : "");
    assert.equal(
      abacusTranslate(t, "abacus.level_numbers"),
      ABACUS_I18N_DEFAULTS.level_numbers,
    );
  });
});
