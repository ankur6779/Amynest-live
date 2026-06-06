import { describe, expect, it } from "vitest";
import { FetchTimeoutError } from "@/lib/fetch-with-timeout";
import {
  isBenignRuntimeError,
  isCrashDebugOverlayEnabled,
  isInfiniteRenderError,
  isProductionEnvironment,
  shouldShowProductionCrashOverlay,
} from "@/lib/runtime-crash-policy";

describe("runtime-crash-policy", () => {
  it("treats FetchTimeoutError as benign", () => {
    expect(isBenignRuntimeError(new FetchTimeoutError(8000))).toBe(true);
  });

  it("treats timed-out fetch messages as benign", () => {
    expect(isBenignRuntimeError(new Error("Request timed out after 8000ms"))).toBe(true);
  });

  it("detects infinite render errors", () => {
    expect(isInfiniteRenderError(new Error("Maximum update depth exceeded"))).toBe(true);
    expect(isInfiniteRenderError(new Error("Too many re-renders"))).toBe(true);
    expect(isInfiniteRenderError(new Error("Something else"))).toBe(false);
  });

  it("never shows production crash overlay for infinite render errors", () => {
    const err = new Error("Maximum update depth exceeded");
    expect(shouldShowProductionCrashOverlay(err, "react.render")).toBe(false);
  });

  it("never shows production crash overlay for bootstrap in production mode", () => {
    const prod = isProductionEnvironment();
    const err = new Error("bootstrap failed");
    expect(shouldShowProductionCrashOverlay(err, "bootstrap")).toBe(!prod);
  });

  it("aligns debug overlay with production environment", () => {
    expect(isCrashDebugOverlayEnabled()).toBe(!isProductionEnvironment());
  });
});
