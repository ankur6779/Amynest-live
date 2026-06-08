import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProductionSameOriginApi } from "@/config";
import { getAppApiBaseOrigin, resolveApiMediaUrl } from "@/lib/api";

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

describe("resolveApiMediaUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rewrites /api/* paths to the configured API origin", () => {
    vi.stubEnv("VITE_APP_API_ORIGIN", "https://api.example.com");
    expect(resolveApiMediaUrl("/api/tts/audio/abc123.mp3")).toBe(
      "https://api.example.com/api/tts/audio/abc123.mp3",
    );
  });

  it("keeps bundled infant sleep MP3s on the web origin", () => {
    vi.stubEnv("VITE_APP_API_ORIGIN", "https://api.example.com");
    expect(resolveApiMediaUrl("/infant-sleep-audio/packs/core-v1/lullabies/twinkle.mp3")).toBe(
      "/infant-sleep-audio/packs/core-v1/lullabies/twinkle.mp3",
    );
  });

  it("keeps other same-origin static paths unchanged", () => {
    vi.stubEnv("VITE_APP_API_ORIGIN", "https://api.example.com");
    expect(resolveApiMediaUrl("/pwa-icon-192.png")).toBe("/pwa-icon-192.png");
  });

  it("passes through absolute URLs unchanged", () => {
    const url = "https://cdn.example.com/audio.mp3";
    expect(resolveApiMediaUrl(url)).toBe(url);
  });
});
