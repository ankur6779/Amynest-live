import { afterEach, describe, expect, it, vi } from "vitest";
import { showRealtimeDiagnostics } from "./show-realtime-diagnostics";

describe("showRealtimeDiagnostics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("returns true in dev", () => {
    vi.stubEnv("DEV", true);
    expect(showRealtimeDiagnostics()).toBe(true);
  });

  it("returns false in production without debug flags", () => {
    vi.stubEnv("DEV", false);
    expect(showRealtimeDiagnostics()).toBe(false);
  });

  it("returns true when localStorage debug flag is set", () => {
    vi.stubEnv("DEV", false);
    localStorage.setItem("speech-coach-v2-debug", "1");
    expect(showRealtimeDiagnostics()).toBe(true);
  });

  it("returns true when speechDebug=1 is in the URL", () => {
    vi.stubEnv("DEV", false);
    window.history.replaceState({}, "", "/speech-coach-v2/session?speechDebug=1");
    expect(showRealtimeDiagnostics()).toBe(true);
  });
});
