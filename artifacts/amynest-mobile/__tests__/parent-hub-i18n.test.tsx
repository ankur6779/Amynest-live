/**
 * Parent Hub i18n smoke test (mobile).
 *
 * Mirrors the web test in artifacts/kidschedule/src/__tests__/parent-hub-i18n.test.tsx:
 *   1. parent_hub namespace exists in en/hi/hinglish.
 *   2. hi / hinglish cover every leaf key present in en.
 *   3. A Parent Hub-converted component re-renders translated strings
 *      when the active language changes.
 *
 * The shared `test-setup.ts` mocks out `@/i18n` (so most existing tests
 * don't have to deal with `expo-localization` / `AsyncStorage`). For
 * THIS test we need a real react-i18next instance, so we initialise one
 * ourselves at module load time using the same JSON bundles the app
 * ships in production.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, act } from "@testing-library/react";
import enJson from "../i18n/en.json";
import hiJson from "../i18n/hi.json";
import hinglishJson from "../i18n/hinglish.json";

// react-i18next reads from a singleton i18next instance — initialise one
// here so `useTranslation()` inside `TryFreeBadge` resolves real strings
// instead of falling back to the key. Without this the test-setup mock
// of `@/i18n` would leave react-i18next unbound (NO_I18NEXT_INSTANCE).
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
await i18next.use(initReactI18next).init({
  resources: {
    en: { translation: enJson },
    hi: { translation: hiJson },
    hinglish: { translation: hinglishJson },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  compatibilityJSON: "v4",
});

// Override the test-setup stub so `setLanguage` / `i18n.changeLanguage`
// targets the real instance we just initialised.
vi.mock("@/i18n", () => ({
  default: i18next,
  setLanguage: async (code: string) => {
    await i18next.changeLanguage(code);
  },
  SUPPORTED_LANGUAGES: [
    { code: "en", label: "English", native: "English" },
    { code: "hi", label: "Hindi", native: "हिंदी" },
    { code: "hinglish", label: "Hinglish", native: "Hinglish" },
  ],
}));

// `TryFreeBadge` is imported AFTER the mock above so it picks up the
// real i18n instance.
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

describe("TryFreeBadge re-renders on language change", () => {
  it("renders the localized try-free label after switching to hi", async () => {
    await i18next.changeLanguage("en");
    const view = render(<TryFreeBadge />);
    const enLabel = i18next.t("parent_hub.badges.try_free");
    expect(view.queryByText(enLabel)).not.toBeNull();

    await act(async () => {
      await i18next.changeLanguage("hi");
    });

    const hiLabel = i18next.t("parent_hub.badges.try_free");
    expect(hiLabel).not.toEqual(enLabel);
    expect(view.queryByText(hiLabel)).not.toBeNull();
  });
});

describe("mobile parent_hub copy roundtrips through every supported language", () => {
  // Snapshot the most user-visible Parent Hub keys so a missing
  // translation in any single section (tiles / headers / Amy / emotional
  // cards / locked overlay) fails fast at test time instead of silently
  // surfacing the raw key in the running app.
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
    "%s resolves to a real string in en / hi / hinglish",
    async (key) => {
      const seen = new Set<string>();
      for (const lang of ["en", "hi", "hinglish"] as const) {
        await act(async () => {
          await i18next.changeLanguage(lang);
        });
        const value = i18next.t(key);
        expect(value, `${key} should not fall back to its key in ${lang}`).not.toEqual(key);
        expect(value.trim().length, `${key} is empty in ${lang}`).toBeGreaterThan(0);
        seen.add(value);
      }
      expect(seen.size, `${key} produced identical en + hi strings`).toBeGreaterThan(1);
    },
  );

  it("nutrition_tags + tips_fallbacks return arrays of localised copy", async () => {
    for (const lang of ["en", "hi", "hinglish"] as const) {
      await act(async () => {
        await i18next.changeLanguage(lang);
      });
      const tags = i18next.t("parent_hub.nutrition_tags", {
        returnObjects: true,
      }) as unknown;
      const tips = i18next.t("parent_hub.tips_fallbacks", {
        returnObjects: true,
      }) as unknown;
      expect(Array.isArray(tags), `nutrition_tags is not array in ${lang}`).toBe(true);
      expect(Array.isArray(tips), `tips_fallbacks is not array in ${lang}`).toBe(true);
      expect((tags as string[]).length).toBeGreaterThanOrEqual(3);
      expect((tips as string[]).length).toBeGreaterThanOrEqual(3);
      for (const t of tips as string[]) {
        expect(t.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
