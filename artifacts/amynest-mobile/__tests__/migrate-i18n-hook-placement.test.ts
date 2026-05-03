import { describe, it, expect } from "vitest";

// The migrate-i18n script is plain CommonJS. We pull out the two helpers
// that govern hook placement and test them directly without touching the
// filesystem-driven CLI portion (gated behind `require.main === module`).
//
// These six fixtures are reductions of the EXACT bug patterns fixed in
// Task #249 in:
//   - components/MobileRecipeCard.tsx     (early `return null;` then JSX)
//   - components/AmazingFacts.tsx         (hook inside `if (...) { return ... }`)
//   - components/AppDataStatusBanner.tsx  (hook inside `if (!isOnline)` block)
//   - components/DailyStory.tsx           (helper arrow function before render return)
//   - components/PrintableWorksheets.tsx  (multiple early returns + helper functions)
//   - components/ParentTasks.tsx          (hook inside async useQuery `queryFn`)
//
// For each fixture we assert that:
//   1. ensureUseTranslation produces a file whose useTranslation() call sits
//      at the very top of the component body.
//   2. validateHookPlacement reports zero issues on the rewritten file.
//   3. validateHookPlacement reports at least one issue on the *original*
//      misplaced version (i.e. the guard would have caught the bug).

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  ensureUseTranslation,
  validateHookPlacement,
} = require("../scripts/migrate-i18n.js") as {
  ensureUseTranslation: (s: string) => { content: string; changed: boolean };
  validateHookPlacement: (s: string) => string[];
};

function topOfBodyHook(content: string, componentName: string): boolean {
  // Find the line that opens the named component's body and assert the very
  // next non-blank line is the useTranslation() destructure.
  const lines = content.split("\n");
  const re = new RegExp(
    String.raw`^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+${componentName}\b|^\s*(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+${componentName}\s*[:=]`,
  );
  for (let i = 0; i < lines.length; i++) {
    if (!re.test(lines[i])) continue;
    // Walk to the body-opening `{`.
    let open = i;
    while (open < lines.length && !lines[open].trimEnd().endsWith("{")) open++;
    if (open >= lines.length) return false;
    // First non-blank body line.
    let j = open + 1;
    while (j < lines.length && lines[j].trim() === "") j++;
    return /const\s*\{\s*t\b[^}]*\}\s*=\s*useTranslation\s*\(\s*\)\s*;?\s*$/.test(
      lines[j] ?? "",
    );
  }
  return false;
}

const FIXTURES: Array<{ name: string; component: string; bad: string }> = [
  {
    name: "MobileRecipeCard — hook after `return null;` early return",
    component: "MobileRecipeCard",
    bad: `
import { useTranslation } from "react-i18next";

export function MobileRecipeCard({ recipe }: { recipe: unknown }) {
  if (!recipe) return null;
  const { t } = useTranslation();
  return <Text>{t("recipe.title")}</Text>;
}
`.trimStart(),
  },
  {
    name: "AmazingFacts — hook inside an `if (...) { return ... }` branch",
    component: "AmazingFacts",
    bad: `
import { useTranslation } from "react-i18next";

export function AmazingFacts({ ageMonths = 60 }: { ageMonths?: number }) {
  const filtered: string[] = [];

  if (filtered.length === 0) {
    const { t } = useTranslation();
    return <Text>{t("facts.empty")}</Text>;
  }

  return <Text>{filtered[0]}</Text>;
}
`.trimStart(),
  },
  {
    name: "AppDataStatusBanner — hook inside `if (!isOnline) { ... }` block",
    component: "AppDataStatusBanner",
    bad: `
import { useTranslation } from "react-i18next";

export default function AppDataStatusBanner() {
  const isOnline = false;

  if (!isOnline) {
    const { t } = useTranslation();
    return <Text>{t("banner.offline")}</Text>;
  }

  return null;
}
`.trimStart(),
  },
  {
    name: "DailyStory — hook injected before nested helper arrow's `return (`",
    component: "DailyStory",
    bad: `
import { useTranslation } from "react-i18next";

export function DailyStory({ ageMonths = 36 }: { ageMonths?: number }) {
  if (ageMonths < 12) return null;

  const renderCard = (label: string) => {
    const { t } = useTranslation();
    return <Text>{t("story.card_label")}: {label}</Text>;
  };

  return <View>{renderCard("a")}</View>;
}
`.trimStart(),
  },
  {
    name: "PrintableWorksheets — multiple early returns then hook before render",
    component: "PrintableWorksheets",
    bad: `
import { useTranslation } from "react-i18next";

function today(): string { return "2026-01-01"; }

export function PrintableWorksheets() {
  const loading = false;
  const error: string | null = null;

  if (loading) return <Text>loading…</Text>;
  if (error) return <Text>{error}</Text>;

  const { t } = useTranslation();
  return <Text>{t("worksheets.title")}</Text>;
}
`.trimStart(),
  },
  {
    name: "ParentTasks — hook inside an async useQuery `queryFn` callback",
    component: "ParentTasks",
    bad: `
import { useTranslation } from "react-i18next";

export function ParentTasks() {
  const query = {
    queryFn: async () => {
      const { t } = useTranslation();
      return [t("parent_tasks.fallback")];
    },
  };
  return <Text>{query.queryFn.name}</Text>;
}
`.trimStart(),
  },
];

describe("migrate-i18n hook placement", () => {
  for (const fx of FIXTURES) {
    describe(fx.name, () => {
      it("the original (misplaced) version is rejected by validateHookPlacement", () => {
        const issues = validateHookPlacement(fx.bad);
        expect(
          issues.length,
          `expected at least one placement issue, got: ${JSON.stringify(issues)}`,
        ).toBeGreaterThan(0);
      });

      it("ensureUseTranslation hoists the hook to the top of the component body", () => {
        const { content } = ensureUseTranslation(fx.bad);
        expect(topOfBodyHook(content, fx.component)).toBe(true);
      });

      it("after ensureUseTranslation the file passes validateHookPlacement", () => {
        const { content } = ensureUseTranslation(fx.bad);
        const issues = validateHookPlacement(content);
        expect(issues, issues.join("\n")).toEqual([]);
      });

      it("there is exactly one useTranslation() binding in the rewritten file", () => {
        const { content } = ensureUseTranslation(fx.bad);
        const matches = content.match(/useTranslation\s*\(\s*\)/g) ?? [];
        expect(matches.length).toBe(1);
      });
    });
  }

  it("preserves extra destructured members like `i18n` when hoisting", () => {
    // Mirrors patterns like `app/(tabs)/coach.tsx` which destructure both
    // `t` and `i18n` from useTranslation() and use `i18n` downstream.
    const bad = `
import { useTranslation } from "react-i18next";

export function Coach() {
  if (!ready()) return null;
  const { t, i18n } = useTranslation();
  return <Text>{t("hi")} {i18n.language}</Text>;
}

function ready() { return true; }
`.trimStart();

    const { content } = ensureUseTranslation(bad);
    expect(validateHookPlacement(content)).toEqual([]);
    expect(topOfBodyHook(content, "Coach")).toBe(true);
    // The `i18n` binding must survive the hoist so downstream `i18n.language`
    // still type-checks / runs.
    expect(content).toMatch(
      /const \{ t, i18n \} = useTranslation\(\);/,
    );
    // Still exactly one hook call.
    expect((content.match(/useTranslation\s*\(\s*\)/g) ?? []).length).toBe(1);
  });

  it("preserves extra destructured members even when the misplaced hook lives inside an if-branch", () => {
    const bad = `
import { useTranslation } from "react-i18next";

export function LangBanner() {
  const isOnline = false;
  if (!isOnline) {
    const { t, i18n } = useTranslation();
    return <Text>{t("offline")}::{i18n.language}</Text>;
  }
  return null;
}
`.trimStart();
    const { content } = ensureUseTranslation(bad);
    expect(validateHookPlacement(content)).toEqual([]);
    expect(content).toMatch(/const \{ t, i18n \} = useTranslation\(\);/);
    expect((content.match(/useTranslation\s*\(\s*\)/g) ?? []).length).toBe(1);
  });

  it("a clean file (hook already at top) is left functionally equivalent and passes the guard", () => {
    const clean = `
import { useTranslation } from "react-i18next";

export function Greeting() {
  const { t } = useTranslation();
  return <Text>{t("hello")}</Text>;
}
`.trimStart();
    const { content } = ensureUseTranslation(clean);
    expect(validateHookPlacement(content)).toEqual([]);
    // Still exactly one hook call.
    expect((content.match(/useTranslation\s*\(\s*\)/g) ?? []).length).toBe(1);
  });
});
