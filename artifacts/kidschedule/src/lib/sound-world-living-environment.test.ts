import { describe, expect, it } from "vitest";
import {
  ambienceKindForWorld,
  dayPeriodFromHour,
  livingEnvironmentCaps,
  resolveWeather,
  skyPalette,
} from "./sound-world-living-environment";

describe("sound-world-living-environment", () => {
  it("maps hours to day periods", () => {
    expect(dayPeriodFromHour(7)).toBe("morning");
    expect(dayPeriodFromHour(13)).toBe("afternoon");
    expect(dayPeriodFromHour(18)).toBe("evening");
    expect(dayPeriodFromHour(22)).toBe("night");
    expect(dayPeriodFromHour(2)).toBe("night");
  });

  it("maps worlds to ambience kinds", () => {
    expect(ambienceKindForWorld("animal_world")).toBe("forest");
    expect(ambienceKindForWorld("nature_world")).toBe("nature");
    expect(ambienceKindForWorld("vehicle_world")).toBe("city");
    expect(ambienceKindForWorld("home_sounds_world")).toBe("home");
    expect(ambienceKindForWorld("instrument_world")).toBe("studio");
  });

  it("weather is stable within a cycle window", () => {
    const t = new Date("2026-07-31T10:05:00.000Z");
    const a = resolveWeather("nature_world", t);
    const b = resolveWeather("nature_world", new Date(t.getTime() + 60_000));
    expect(a.weather).toBe(b.weather);
    expect(a.intensity).toBe(b.intensity);
  });

  it("sky palette exists for every period", () => {
    for (const period of ["morning", "afternoon", "evening", "night"] as const) {
      const p = skyPalette(period, "animal_world");
      expect(p.from).toBeTruthy();
      expect(p.to).toBeTruthy();
    }
  });

  it("night/evening overlays stay transparent so they cannot paint a black wash", () => {
    expect(skyPalette("night", "animal_world").overlay).toBe("transparent");
    expect(skyPalette("evening", "animal_world").overlay).toBe("transparent");
    const night = skyPalette("night", "animal_world");
    // Keep night tint light — high alpha under translucent cards looked like a freeze overlay.
    expect(night.from).toMatch(/0\.1[0-9]\)/);
  });

  it("reduced motion disables atmosphere and audio", () => {
    const caps = livingEnvironmentCaps(true);
    expect(caps.allowAtmosphere).toBe(false);
    expect(caps.allowAmbientAudio).toBe(false);
    expect(caps.allowObjectLife).toBe(false);
    expect(caps.allowSky).toBe(true);
  });
});
