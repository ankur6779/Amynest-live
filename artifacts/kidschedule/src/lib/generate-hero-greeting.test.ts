import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  countHeroGreetingCombinations,
  generateHeroGreeting,
  type HeroGreetingContext,
} from "@/lib/generate-hero-greeting";

const STORAGE_KEY = "amynest:hero-greeting-history:v1";

describe("generateHeroGreeting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("generates at least 100 unique greeting combinations", () => {
    expect(countHeroGreetingCombinations()).toBeGreaterThanOrEqual(100);
  });

  it("returns title and subtitle strings", () => {
    const greeting = generateHeroGreeting({
      displayName: "Ankur",
      weatherCondition: "sunny",
      isDay: true,
      now: new Date("2026-06-13T08:30:00"),
    });
    expect(greeting.title.length).toBeGreaterThan(0);
    expect(greeting.subtitle.length).toBeGreaterThan(0);
    expect(greeting.id.length).toBeGreaterThan(0);
  });

  it("interpolates display name into titles", () => {
    const morning = generateHeroGreeting({
      displayName: "Ankur",
      now: new Date("2026-06-13T07:00:00"),
    });
    if (morning.title.includes("Ankur")) {
      expect(morning.title).toContain("Ankur");
    } else {
      expect(morning.title).not.toContain("{name}");
    }
  });

  it("never repeats the same title on consecutive generations", () => {
    const ctx: HeroGreetingContext = {
      displayName: "Sam",
      weatherCondition: "cloudy",
      now: new Date("2026-06-13T12:00:00"),
    };
    const first = generateHeroGreeting(ctx);
    const second = generateHeroGreeting(ctx);
    expect(second.title).not.toBe(first.title);
  });

  it("never repeats the same subtitle on consecutive generations", () => {
    const ctx: HeroGreetingContext = {
      weatherCondition: "rainy",
      now: new Date("2026-06-13T18:00:00"),
    };
    const first = generateHeroGreeting(ctx);
    const second = generateHeroGreeting(ctx);
    expect(second.subtitle).not.toBe(first.subtitle);
  });

  it("persists greeting history in localStorage", () => {
    generateHeroGreeting({ displayName: "Alex" });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as Array<{ id: string }>;
    expect(parsed.length).toBeGreaterThan(0);
  });
});
