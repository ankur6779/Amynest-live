import { describe, expect, it } from "vitest";
import {
  isBenignRuntimeError,
  isRecoverableRuntimeError,
  shouldShowProductionCrashOverlay,
} from "./runtime-crash-policy";

describe("runtime-crash-policy", () => {
  it("treats AbortError and network failures as benign", () => {
    expect(isBenignRuntimeError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isBenignRuntimeError(new Error("Failed to fetch"))).toBe(true);
    expect(isBenignRuntimeError(new Error("ResizeObserver loop limit exceeded"))).toBe(
      true,
    );
  });

  it("treats chunk load errors as recoverable", () => {
    expect(isRecoverableRuntimeError(new Error("Loading chunk 42 failed"))).toBe(true);
  });

  it("suppresses unhandledrejection overlay in production mode", () => {
    expect(
      shouldShowProductionCrashOverlay(new Error("Failed to fetch"), "unhandledrejection"),
    ).toBe(false);
  });

  it("allows bootstrap failures to surface", () => {
    expect(
      shouldShowProductionCrashOverlay(new Error("Missing root"), "bootstrap"),
    ).toBe(true);
  });
});
