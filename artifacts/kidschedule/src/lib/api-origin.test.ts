import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProductionSameOriginApi, resolveProductionWorkerApiOrigin } from "@/config";
import {
  getAppApiBaseOrigin,
  mergeAmyNestApiClientHeaders,
  resolveApiMediaUrl,
  usesCloudflareWorkerApiPath,
} from "@/lib/api";

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

  it("uses Cloudflare Worker origin for Capacitor iOS in production", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_AMYNEST_ENV", "production");
    vi.stubEnv("VITE_APP_API_ORIGIN", "");
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        protocol: "capacitor:",
        origin: "capacitor://localhost",
      },
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
    });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
    expect(getAppApiBaseOrigin()).toBe("https://www.amynest.in");
    expect(getAppApiBaseOrigin()).not.toContain("onrender.com");
  });

  it("still uses Render direct for Capacitor in development", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_AMYNEST_ENV", "development");
    vi.stubEnv("VITE_APP_API_ORIGIN", "");
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        protocol: "capacitor:",
        origin: "capacitor://localhost",
      },
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
    });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
    expect(getAppApiBaseOrigin()).toBe("https://amynest-dev.onrender.com");
  });
});

describe("resolveProductionWorkerApiOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns www.amynest.in in production", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_AMYNEST_ENV", "production");
    expect(resolveProductionWorkerApiOrigin()).toBe("https://www.amynest.in");
  });

  it("returns null in dev", () => {
    vi.stubEnv("PROD", false);
    expect(resolveProductionWorkerApiOrigin()).toBeNull();
  });
});

describe("mergeAmyNestApiClientHeaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds worker + ios headers for Capacitor iOS on worker origin", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_AMYNEST_ENV", "production");
    vi.stubEnv("VITE_APP_API_ORIGIN", "https://www.amynest.in");
    vi.stubGlobal("window", {
      location: { hostname: "localhost", origin: "capacitor://localhost" },
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
    });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });

    const merged = mergeAmyNestApiClientHeaders({});
    const headers = new Headers(merged.headers);
    expect(headers.get("x-amynest-api-path")).toBe("worker");
    expect(headers.get("x-amynest-platform")).toBe("ios");
  });

  it("skips headers when API origin is Render direct", () => {
    vi.stubEnv("VITE_APP_API_ORIGIN", "https://amynest-backend-dykj.onrender.com");
    const merged = mergeAmyNestApiClientHeaders({});
    const headers = new Headers(merged.headers);
    expect(headers.get("x-amynest-api-path")).toBeNull();
  });
});

describe("usesCloudflareWorkerApiPath", () => {
  it("detects worker origin", () => {
    expect(usesCloudflareWorkerApiPath("https://www.amynest.in")).toBe(true);
    expect(usesCloudflareWorkerApiPath("https://amynest-backend-dykj.onrender.com")).toBe(
      false,
    );
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
