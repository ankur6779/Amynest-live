import { describe, expect, it } from "vitest";
import { createEmptySetupDraft } from "../models/setup-draft";
import {
  needsAgeSanityWarning,
  validateBirthDate,
  validateBirthTime,
  validateReadyForCreate,
} from "./setup-validators";

describe("setup validators", () => {
  it("requires date and rejects future", () => {
    expect(validateBirthDate(null).ok).toBe(false);
    expect(validateBirthDate("1899-12-31").ok).toBe(false);
    expect(validateBirthDate("2099-01-01").ok).toBe(false);
    expect(validateBirthDate("2020-06-15").ok).toBe(true);
  });

  it("rejects invalid civil dates", () => {
    expect(validateBirthDate("2021-02-29").ok).toBe(false);
    expect(validateBirthDate("2020-02-29").ok).toBe(true);
  });

  it("unknown time requires null clock", () => {
    expect(validateBirthTime("unknown", null).ok).toBe(true);
    expect(validateBirthTime("unknown", "12:00").ok).toBe(false);
    expect(validateBirthTime("exact", "12:30").ok).toBe(true);
    expect(validateBirthTime("exact", null).ok).toBe(false);
  });

  it("blocks create without consent", () => {
    const d = createEmptySetupDraft(1, "Amy");
    d.birthDate = "2020-01-01";
    d.timePrecision = "unknown";
    d.birthTime = null;
    d.placeSkipped = true;
    expect(validateReadyForCreate(d).ok).toBe(false);
    d.consent.disclaimerAccepted = true;
    d.consent.consentVersion = "v1";
    d.consent.acceptedAt = new Date().toISOString();
    expect(validateReadyForCreate(d).ok).toBe(true);
  });

  it("age sanity warning for >25 years", () => {
    expect(needsAgeSanityWarning("1990-01-01", false)).toBe(true);
    expect(needsAgeSanityWarning("1990-01-01", true)).toBe(false);
  });
});
