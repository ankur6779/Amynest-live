import { describe, expect, it } from "vitest";
import { parseBirthHour, resolveLivingSkyTheme } from "./living-sky-theme";

describe("living-sky-theme", () => {
  it("parses birth hour from HH:MM", () => {
    expect(parseBirthHour("06:30")).toBe(6);
    expect(parseBirthHour("22:15:00")).toBe(22);
    expect(parseBirthHour(null)).toBeNull();
  });

  it("gives unique moods for different charts", () => {
    const a = resolveLivingSkyTheme({
      childName: "A",
      sunSign: "Leo",
      moonSign: "Cancer",
      birthTime: "06:00",
      timePrecision: "exact",
      dayKey: "2026-07-26",
    });
    const b = resolveLivingSkyTheme({
      childName: "B",
      sunSign: "Aquarius",
      moonSign: "Gemini",
      birthTime: "23:00",
      timePrecision: "exact",
      dayKey: "2026-07-26",
    });
    expect(a.mood).toBe("sunrise");
    expect(b.mood).toBe("night");
    expect(a.className).not.toBe(b.className);
  });

  it("varies subtly by day without changing chart meaning", () => {
    const d1 = resolveLivingSkyTheme({
      childName: "Sam",
      sunSign: "Virgo",
      moonSign: "Taurus",
      dayKey: "2026-07-01",
    });
    const d2 = resolveLivingSkyTheme({
      childName: "Sam",
      sunSign: "Virgo",
      moonSign: "Taurus",
      dayKey: "2026-07-02",
    });
    expect(d1.mood).toBe(d2.mood);
    expect(d1.dayVariant).not.toBe(d2.dayVariant);
  });
});
