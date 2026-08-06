import { describe, expect, it } from "vitest";
import {
  V2_EXIT,
  V2_HOPE_EMPTY,
  V2_ICON,
  V2_ICON_STROKE,
  V2_SCROLL,
  V2_WEIGHT_MISSION,
} from "./finish";

describe("Founder final finish tokens", () => {
  it("exit labels feel human, not mechanical", () => {
    expect(V2_EXIT.notRightNow).toBe("Not right now");
    expect(V2_EXIT.backToToday).toBe("Back to today");
    expect(V2_EXIT.chooseAgain).toBe("Choose again");
    for (const label of Object.values(V2_EXIT)) {
      expect(label.toLowerCase()).not.toMatch(/cancel|dismiss|close|abort/);
    }
  });

  it("icons share one stroke + size ladder", () => {
    expect(V2_ICON_STROKE).toBe(1.75);
    expect(V2_ICON.md).toMatch(/--v2-icon-ui/);
    expect(V2_ICON.sm).toMatch(/h-4 w-4/);
    expect(V2_ICON.nav).toMatch(/--v2-icon-nav/);
  });

  it("hope empty avoids absence language", () => {
    expect(V2_HOPE_EMPTY.toLowerCase()).toMatch(/getting started|build/);
    expect(V2_HOPE_EMPTY.toLowerCase()).not.toMatch(/empty|no data|nothing here/);
  });

  it("mission stays full · coach peer recedes (Law of Three)", async () => {
    const { V2_WEIGHT_COACH } = await import("./finish");
    expect(V2_WEIGHT_MISSION).toMatch(/shadow-none/);
    expect(V2_WEIGHT_MISSION).not.toMatch(/ring/);
    expect(V2_WEIGHT_COACH).toMatch(/opacity-80/);
    expect(V2_SCROLL).toMatch(/overscroll-y-contain/);
  });
});
