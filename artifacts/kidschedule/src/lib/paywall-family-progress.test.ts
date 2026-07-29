import { describe, expect, it } from "vitest";
import {
  buildFamilyProgressItems,
  resolveWinbackProgressLine,
} from "@/lib/paywall-family-progress";
import type { Entitlements } from "@/hooks/use-subscription";

function entitlementsWith(partial: Partial<Entitlements["usage"]>): Entitlements {
  return {
    isPremium: false,
    usage: {
      aiQueriesToday: 0,
      infantAiQueriesToday: 0,
      features: {},
      ...partial,
    },
  } as Entitlements;
}

describe("buildFamilyProgressItems", () => {
  it("returns empty when no real metrics exist", () => {
    expect(buildFamilyProgressItems(null, { routineStreakDays: 0, birthSkyCreated: false })).toEqual(
      [],
    );
  });

  it("includes only available real metrics", () => {
    const items = buildFamilyProgressItems(
      entitlementsWith({
        aiQueriesToday: 5,
        features: {
          routine_generate: { used: 2, limit: 3 },
        },
      }),
      { routineStreakDays: 7, birthSkyCreated: true },
    );
    expect(items.map((i) => i.id)).toEqual(["routines", "ai", "streak", "birth_sky"]);
    expect(items[0]?.label).toContain("2 routines");
  });

  it("never invents milestone counts", () => {
    const items = buildFamilyProgressItems(entitlementsWith({}), {
      routineStreakDays: 0,
      birthSkyCreated: false,
    });
    expect(items.every((i) => !i.label.toLowerCase().includes("milestone"))).toBe(true);
  });
});

describe("resolveWinbackProgressLine", () => {
  it("stays quiet until multiple paywall visits", () => {
    expect(
      resolveWinbackProgressLine(2, [{ id: "ai", label: "1 AI question answered today" }]),
    ).toBeNull();
  });

  it("personalizes after repeated visits with real progress", () => {
    const line = resolveWinbackProgressLine(3, [
      { id: "ai", label: "1 AI question answered today" },
      { id: "routines", label: "2 routines created" },
    ]);
    expect(line).toContain("2 parenting activities");
    expect(line).toContain("Premium keeps the journey going");
  });
});
