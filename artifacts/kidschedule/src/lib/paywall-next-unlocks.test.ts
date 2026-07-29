import { describe, expect, it } from "vitest";
import { resolveNextUnlocks } from "@/lib/paywall-next-unlocks";

describe("resolveNextUnlocks", () => {
  it("prioritizes speech unlocks for speech paywalls", () => {
    const items = resolveNextUnlocks("speech_coach");
    expect(items[0]?.id).toBe("speech");
    expect(items.length).toBeLessThanOrEqual(6);
  });

  it("prioritizes Birth Sky for birth_sky module", () => {
    const items = resolveNextUnlocks("premium_insight", "birth_sky");
    expect(items[0]?.id).toBe("birth_sky");
  });
});
