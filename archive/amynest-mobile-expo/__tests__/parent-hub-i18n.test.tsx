/**
 * Parent Hub i18n smoke test (mobile).
 *
 * Ensures that:
 *   1. The `parent_hub.*` namespace exists in the English bundle.
 *   2. A Parent Hub-converted component re-renders translated strings
 *      when the active language is English.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, act } from "@testing-library/react";
import enJson from "../i18n/en.json";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
await i18next.use(initReactI18next).init({
  resources: {
    en: { translation: enJson },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  compatibilityJSON: "v4",
});

vi.mock("@/i18n", () => ({
  default: i18next,
  setLanguage: async (code: string) => {
    await i18next.changeLanguage(code);
  },
  SUPPORTED_LANGUAGES: [
    { code: "en", label: "English", native: "English" },
  ],
}));

const { default: TryFreeBadge } = await import("../components/TryFreeBadge");

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
  await i18next.changeLanguage("en");
});

describe("mobile parent_hub i18n bundles", () => {
  it("has a parent_hub namespace in English", () => {
    expect((enJson as AnyDict).parent_hub).toBeTypeOf("object");
  });

  it("English parent_hub keys all resolve to non-empty strings", () => {
    const enKeys = flatten((enJson as AnyDict).parent_hub as AnyDict, "parent_hub");
    const empty = enKeys.filter((k) => {
      const val = i18next.t(k);
      return !val || val === k;
    });
    expect(empty, `en keys with missing values: ${empty.join(", ")}`).toEqual([]);
  });
});

describe("TryFreeBadge renders the try-free label in English", () => {
  it("renders the localized try-free label in English", async () => {
    await i18next.changeLanguage("en");
    const view = render(<TryFreeBadge />);
    const enLabel = i18next.t("parent_hub.badges.try_free");
    expect(view.queryByText(enLabel)).not.toBeNull();
  });
});

describe("mobile parent_hub copy resolves through English", () => {
  const HUB_KEYS = [
    "parent_hub.tiles.articles.title",
    "parent_hub.tiles.activities.lead",
    "parent_hub.tiles.ptm-prep.sublabel",
    "parent_hub.tiles.smart-study.title",
    "parent_hub.tiles.morning-flow.sublabel",
    "parent_hub.tiles.kids-control-center.soon",
    "parent_hub.tiles_activity.audio_lessons.desc",
    "parent_hub.headers.explore_next",
    "parent_hub.headers.previewing",
    "parent_hub.headers.coming_next",
    "parent_hub.amy.lead",
    "parent_hub.amy.prompts.school.label",
    "parent_hub.emotional_cards.anxious.title",
    "parent_hub.emotional_footer.reassure_body",
    "parent_hub.locked.cta",
    "parent_hub.empty.heading",
  ];

  it.each(HUB_KEYS)(
    "%s resolves to a real string in English",
    async (key) => {
      await act(async () => {
        await i18next.changeLanguage("en");
      });
      const value = i18next.t(key);
      expect(value, `${key} should not fall back to its key`).not.toEqual(key);
      expect(value.trim().length, `${key} is empty`).toBeGreaterThan(0);
    },
  );

  it("nutrition_tags + tips_fallbacks return arrays of English copy", async () => {
    await act(async () => {
      await i18next.changeLanguage("en");
    });
    const tags = i18next.t("parent_hub.nutrition_tags", {
      returnObjects: true,
    }) as unknown;
    const tips = i18next.t("parent_hub.tips_fallbacks", {
      returnObjects: true,
    }) as unknown;
    expect(Array.isArray(tags), "nutrition_tags is not array").toBe(true);
    expect(Array.isArray(tips), "tips_fallbacks is not array").toBe(true);
    expect((tags as string[]).length).toBeGreaterThanOrEqual(3);
    expect((tips as string[]).length).toBeGreaterThanOrEqual(3);
    for (const t of tips as string[]) {
      expect(t.trim().length).toBeGreaterThan(0);
    }
  });
});
