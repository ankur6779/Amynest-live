import { describe, expect, it } from "vitest";
import { formatPhoneE164, isValidNationalPhone } from "./validate";

describe("formatPhoneE164", () => {
  it("formats India mobile to E.164", () => {
    expect(formatPhoneE164("9876543210", "IN")).toBe("+919876543210");
  });

  it("formats US number to E.164", () => {
    expect(formatPhoneE164("4155552671", "US")).toBe("+14155552671");
  });

  it("returns null for invalid number", () => {
    expect(formatPhoneE164("123", "US")).toBeNull();
  });
});

describe("isValidNationalPhone", () => {
  it("validates India 10-digit mobile", () => {
    expect(isValidNationalPhone("9876543210", "IN")).toBe(true);
  });

  it("rejects too-short India number", () => {
    expect(isValidNationalPhone("98765", "IN")).toBe(false);
  });
});
