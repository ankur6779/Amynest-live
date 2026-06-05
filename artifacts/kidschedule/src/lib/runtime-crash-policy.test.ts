import { describe, expect, it } from "vitest";
import { FetchTimeoutError } from "@/lib/fetch-with-timeout";
import { isBenignRuntimeError } from "@/lib/runtime-crash-policy";

describe("runtime-crash-policy", () => {
  it("treats FetchTimeoutError as benign", () => {
    expect(isBenignRuntimeError(new FetchTimeoutError(8000))).toBe(true);
  });

  it("treats timed-out fetch messages as benign", () => {
    expect(isBenignRuntimeError(new Error("Request timed out after 8000ms"))).toBe(true);
  });
});
