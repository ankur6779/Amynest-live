import { describe, expect, it } from "vitest";
import {
  buildForChildDiscoverCta,
  buildForChildGuestCta,
  buildForChildHope,
  buildForChildSheetBody,
  buildForChildSheetTitle,
} from "./for-child-copy";

describe("For Child copy", () => {
  it("names the child with hope — never empty-state shame", () => {
    expect(buildForChildSheetTitle({ name: "Aria" })).toBe("For Aria");
    expect(buildForChildSheetBody({ name: "Aria" })).toMatch(/Protect this place/);
    expect(buildForChildSheetBody({ name: "Aria" })).toMatch(/Aria/);
    expect(buildForChildSheetBody({ name: "Aria" }).toLowerCase()).not.toMatch(
      /nothing here|empty|no data|coming soon|play, learn, and care|create your account|getting started/,
    );
    expect(buildForChildGuestCta({ name: "Aria" })).toBe("Protect Aria's place");
    expect(buildForChildDiscoverCta({ name: "Aria" })).toBe(
      "See what's waiting for Aria",
    );
    expect(buildForChildHope({ name: "Aria" })).toMatch(/already growing/);
    expect(buildForChildHope({ name: "Aria" })).toMatch(/quietly preparing/);
  });

  it("falls back gently without a name", () => {
    expect(buildForChildSheetTitle({ name: null })).toBe("For your child");
    expect(buildForChildSheetBody({ name: null })).toMatch(/Protect this place/);
    expect(buildForChildDiscoverCta({ name: null })).toBe("See what's waiting");
    expect(buildForChildHope({ name: null })).toMatch(/already growing/);
  });
});
