import { describe, expect, it, vi } from "vitest";
import { generateFacebookLoginNonce } from "./facebook-auth";

vi.mock("@/lib/device-lite", () => ({
  isNativeAmyNestAndroidWrapper: () => false,
}));

vi.mock("@/lib/native-shell", () => ({
  isNativeAmyNestShell: () => false,
}));

describe("facebook-auth", () => {
  it("generates a nonce of the requested length", () => {
    const nonce = generateFacebookLoginNonce(40);
    expect(nonce).toHaveLength(40);
    expect(nonce).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("generates distinct nonces", () => {
    expect(generateFacebookLoginNonce()).not.toBe(generateFacebookLoginNonce());
  });
});
