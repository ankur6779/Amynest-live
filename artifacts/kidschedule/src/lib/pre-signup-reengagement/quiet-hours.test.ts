import { describe, expect, it } from "vitest";
import { adjustOutOfQuietHours, enforceDailyCap, isQuietHour } from "./quiet-hours";

describe("pre-signup quiet hours", () => {
  it("detects 10 PM – 8 AM as quiet", () => {
    expect(isQuietHour(new Date("2026-06-15T23:00:00"))).toBe(true);
    expect(isQuietHour(new Date("2026-06-15T07:30:00"))).toBe(true);
    expect(isQuietHour(new Date("2026-06-15T12:00:00"))).toBe(false);
  });

  it("shifts late-night fire times to 8 AM next day", () => {
    const raw = new Date("2026-06-15T23:30:00").getTime();
    const adjusted = adjustOutOfQuietHours(raw);
    const d = new Date(adjusted);
    expect(d.getHours()).toBe(8);
    expect(d.getDate()).toBe(16);
  });

  it("caps at two notifications per calendar day", () => {
    const counts = new Map<string, number>();
    const day1a = enforceDailyCap(new Date("2026-06-15T10:00:00").getTime(), counts, 2);
    const day1b = enforceDailyCap(new Date("2026-06-15T14:00:00").getTime(), counts, 2);
    const overflow = enforceDailyCap(new Date("2026-06-15T16:00:00").getTime(), counts, 2);

    expect(new Date(day1a).toISOString().slice(0, 10)).toBe("2026-06-15");
    expect(new Date(day1b).toISOString().slice(0, 10)).toBe("2026-06-15");
    expect(new Date(overflow).toISOString().slice(0, 10)).toBe("2026-06-16");
  });
});
