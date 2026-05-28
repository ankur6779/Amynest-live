import { describe, expect, it } from "vitest";
import { generateFacebookLoginNonce } from "./facebook-auth";

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
