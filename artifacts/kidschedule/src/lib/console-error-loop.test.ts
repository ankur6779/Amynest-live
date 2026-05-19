import { describe, expect, it, vi } from "vitest";
import { installGlobalErrorHandlers } from "./global-error-handlers";
import { logError } from "./crash-logger";

describe("console.error feedback loop", () => {
  it("does not recurse when logError runs after handlers install", () => {
    const calls: unknown[][] = [];
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      calls.push(args);
      if (calls.length > 50) {
        throw new Error("console.error loop detected");
      }
      original(...args);
    };

    installGlobalErrorHandlers();

    expect(() => {
      logError(new TypeError("Failed to fetch"), "API:GET:/api/test");
    }).not.toThrow();

    expect(calls.length).toBeLessThan(5);
  });
});
