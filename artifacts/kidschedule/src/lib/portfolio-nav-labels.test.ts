import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  livingNavHomeLabel,
  livingNavHubLabel,
  livingNavRoutinesLabel,
} from "./portfolio-nav-labels";

describe("portfolio-nav-labels (P1 places of life)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to calm places-of-life labels when living flags unset", () => {
    expect(livingNavHomeLabel()).toBe("Home");
    expect(livingNavRoutinesLabel()).toBe("Today's plan");
    expect(livingNavHubLabel()).toBe("Rooms");
  });

  it("restores SKU dialect when living flags are OFF", () => {
    vi.stubEnv("VITE_FF_TODAY_HOME_V1", "0");
    vi.stubEnv("VITE_FF_ROUTINE_LIVING_V1", "0");
    vi.stubEnv("VITE_FF_PARENT_HUB_ROOMS_V1", "0");
    expect(livingNavHomeLabel()).toBe("Dashboard");
    expect(livingNavRoutinesLabel()).toBe("Routines");
    expect(livingNavHubLabel()).toBe("Parenting Hub");
  });
});
