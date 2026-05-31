import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProductionSameOriginApi } from "@/config";
import { getAppApiBaseOrigin } from "@/lib/api";

describe("resolveProductionSameOriginApi", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns origin on production www.amynest.in", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_AMYNEST_ENV", "production");
    vi.stubGlobal("window", {
      location: { hostname: "www.amynest.in", origin: "https://www.amynest.in" },
    });
    expect(resolveProductionSameOriginApi()).toBe("https://www.amynest.in");
  });

  it("returns null in dev", () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_AMYNEST_ENV", "development");
    vi.stubGlobal("window", {
      location: { hostname: "www.amynest.in", origin: "https://www.amynest.in" },
    });
    expect(resolveProductionSameOriginApi()).toBeNull();
  });
});

describe("getAppApiBaseOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers VITE_APP_API_ORIGIN when set", () => {
    vi.stubEnv("VITE_APP_API_ORIGIN", "https://custom.example.com");
    expect(getAppApiBaseOrigin()).toBe("https://custom.example.com");
  });

  it("uses same-origin on production amynest.in when env unset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_AMYNEST_ENV", "production");
    vi.stubEnv("VITE_APP_API_ORIGIN", "");
    vi.stubGlobal("window", {
      location: { hostname: "www.amynest.in", origin: "https://www.amynest.in" },
    });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
    expect(getAppApiBaseOrigin()).toBe("https://www.amynest.in");
  });
});
