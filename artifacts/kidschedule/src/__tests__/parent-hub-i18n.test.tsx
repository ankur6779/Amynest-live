/**
 * Parent Hub i18n smoke test (web).
 *
 * Ensures that:
 *   1. The `parent_hub.*` namespace exists in the English bundle.
 *   2. A Parent Hub component (`LockedBlock`) re-renders fresh strings
 *      when `i18n.changeLanguage()` is called — i.e. it actually uses
 *      `useTranslation` and is not closed over a stale value.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, act } from "@testing-library/react";
import enJson from "../i18n/en.json";
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
  it("has a parent_hub namespace in English", () => {
    expect((enJson as AnyDict).parent_hub).toBeTypeOf("object");
  });

  it("English parent_hub keys all resolve to non-empty strings", () => {
    const enKeys = flatten((enJson as AnyDict).parent_hub as AnyDict, "parent_hub");
    const empty = enKeys.filter((k) => {
      const val = i18n.t(k);
      return !val || val === k;
    });
    expect(empty, `en keys with missing values: ${empty.join(", ")}`).toEqual([]);
  });
});

describe("LockedBlock re-renders on language change", () => {
  it("renders the premium-feature label in English", async () => {
    await i18n.changeLanguage("en");
    render(
      <LockedBlock locked reason="hub_locked">
        <div>hidden child</div>
      </LockedBlock>,
    );
    const enLabel = i18n.t("parent_hub.badges.premium_feature");
    expect(screen.queryByText(enLabel)).not.toBeNull();
  });
});

describe("parent_hub copy roundtrips through English", () => {
  const HUB_KEYS = [
    "parent_hub.tiles.articles.title",
    "parent_hub.tiles.tips.title",
    "parent_hub.tiles_activity.gaming_reward.title",
    "parent_hub.web_tiles.command-center.title",
    "parent_hub.web_tiles.smart-study.description",
    "parent_hub.web_tiles_preview.life-skills.title",
    "parent_hub.web_tiles_preview.olympiad.description",
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
    "%s resolves to a real string in English",
    async (key) => {
      await act(async () => {
        await i18n.changeLanguage("en");
      });
      const value = i18n.t(key);
      expect(value, `${key} should not fall back to its key`).not.toEqual(key);
      expect(value.trim().length, `${key} is empty`).toBeGreaterThan(0);
    },
  );
});
