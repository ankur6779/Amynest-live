import { describe, expect, it } from "vitest";
import { isDay0SecondaryHref, shouldShowDay0SecondarySurfaces } from "./day0-discovery";

describe("day0 discovery sequencing", () => {
  it("hides Hub, Rooms, Games, Birth Sky, and Health Lab until first plan", () => {
    localStorage.clear();
    expect(shouldShowDay0SecondarySurfaces(0)).toBe(false);
    expect(isDay0SecondaryHref("/parenting-hub#help")).toBe(true);
    expect(isDay0SecondaryHref("/games")).toBe(true);
    expect(isDay0SecondaryHref("/birth-sky")).toBe(true);
    expect(isDay0SecondaryHref("/health-lab")).toBe(true);
    expect(isDay0SecondaryHref("/dashboard")).toBe(false);
    expect(isDay0SecondaryHref("/routines")).toBe(false);
  });

  it("reveals secondary surfaces after first routine progress", () => {
    localStorage.setItem("amynest:sub:first_routine_activated", "1");
    expect(shouldShowDay0SecondarySurfaces(0)).toBe(true);
  });
});
