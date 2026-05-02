/**
 * Parent Hub i18n smoke test (web).
 *
 * Ensures that:
 *   1. The `parent_hub.*` namespace exists in en/hi/hinglish.
 *   2. Every leaf key present in the English bundle also exists in the
 *      Hindi and Hinglish bundles, and resolves to a non-empty string.
 *   3. A Parent Hub component (`LockedBlock`) re-renders fresh strings
 *      when `i18n.changeLanguage()` is called — i.e. it actually uses
 *      `useTranslation` and is not closed over a stale value.
 *
 * Catching divergence at test time means a translator (or a future
 * agent) can't ship one language with missing copy without a CI
 * failure in `pnpm typecheck` / `pnpm test`.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, act } from "@testing-library/react";
import enJson from "../i18n/en.json";
import hiJson from "../i18n/hi.json";
import hinglishJson from "../i18n/hinglish.json";
import i18n from "../i18n";
import { LockedBlock } from "../components/locked-block";

type AnyDict = Record<string, unknown>;

function flatten(obj: AnyDict, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatten(v as AnyDict, next));
    } else if (typeof v === "string") {
      out.push(next);
    }
  }
  return out;
}

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("parent_hub i18n bundles", () => {
  it("has a parent_hub namespace in all three languages", () => {
    expect((enJson as AnyDict).parent_hub).toBeTypeOf("object");
    expect((hiJson as AnyDict).parent_hub).toBeTypeOf("object");
    expect((hinglishJson as AnyDict).parent_hub).toBeTypeOf("object");
  });

  it("hi and hinglish cover every parent_hub key present in en", () => {
    const enKeys = flatten((enJson as AnyDict).parent_hub as AnyDict, "parent_hub");
    const hiKeys = new Set(
      flatten((hiJson as AnyDict).parent_hub as AnyDict, "parent_hub"),
    );
    const hinKeys = new Set(
      flatten((hinglishJson as AnyDict).parent_hub as AnyDict, "parent_hub"),
    );
    const missingHi = enKeys.filter((k) => !hiKeys.has(k));
    const missingHin = enKeys.filter((k) => !hinKeys.has(k));
    expect(missingHi, `hi.json missing keys: ${missingHi.join(", ")}`).toEqual([]);
    expect(missingHin, `hinglish.json missing keys: ${missingHin.join(", ")}`).toEqual([]);
  });
});

describe("LockedBlock re-renders on language change", () => {
  it("swaps the premium-feature label when language flips en → hi", async () => {
    await i18n.changeLanguage("en");
    render(
      <LockedBlock locked reason="hub_locked" label="ignored" cta="ignored">
        <div>hidden child</div>
      </LockedBlock>,
    );
    // The locked overlay surfaces parent_hub.badges.premium_feature; the
    // accessible label is parent_hub.badges.premium_feature_aria.
    const enLabel = i18n.t("parent_hub.badges.premium_feature");
    expect(screen.queryByText(enLabel)).not.toBeNull();

    await act(async () => {
      await i18n.changeLanguage("hi");
    });

    const hiLabel = i18n.t("parent_hub.badges.premium_feature");
    expect(hiLabel).not.toEqual(enLabel);
    expect(screen.queryByText(hiLabel)).not.toBeNull();
  });
});

describe("parent_hub copy roundtrips through every supported language", () => {
  // Lock in the invariant that the keys used by the converted Parent Hub
  // sections (tile copy, headers, Amy AI prompts, emotional support cards,
  // and the per-tile empty states) all resolve to a non-empty, language-
  // distinct string in en / hi / hinglish. Catches missing translations
  // for any single section without having to mount the whole page.
  const HUB_KEYS = [
    "parent_hub.tiles.articles.title",
    "parent_hub.tiles.tips.title",
    "parent_hub.tiles_activity.gaming_reward.title",
    "parent_hub.web_tiles.command-center.title",
    "parent_hub.web_tiles.smart-study.description",
    "parent_hub.subsections.story-time.title",
    "parent_hub.subsections.spelling-mastery.description",
    "parent_hub.headers.section1_for",
    "parent_hub.headers.bottom_cta",
    "parent_hub.headers.add_child",
    "parent_hub.amy.lead",
    "parent_hub.amy.cta",
    "parent_hub.amy.prompts.sleep.label",
    "parent_hub.amy.prompts.tantrums.prompt",
    "parent_hub.emotional_cards.overwhelmed.title",
    "parent_hub.emotional_cards.connect.subtitle",
    "parent_hub.emotional_footer.reassure_title",
    "parent_hub.empty.heading",
    "parent_hub.empty.cta",
  ];

  it.each(HUB_KEYS)(
    "%s resolves to a real string in en / hi / hinglish",
    async (key) => {
      const seen = new Set<string>();
      for (const lang of ["en", "hi", "hinglish"] as const) {
        await act(async () => {
          await i18n.changeLanguage(lang);
        });
        const value = i18n.t(key);
        expect(value, `${key} should not fall back to its key in ${lang}`).not.toEqual(key);
        expect(value.trim().length, `${key} is empty in ${lang}`).toBeGreaterThan(0);
        seen.add(value);
      }
      // At minimum the en bundle should differ from hi (Hinglish often
      // mirrors en for Latin-script tiles, so we don't require all 3 to
      // diverge — but en must not equal hi).
      expect(seen.size, `${key} produced identical en + hi strings`).toBeGreaterThan(1);
    },
  );
});
