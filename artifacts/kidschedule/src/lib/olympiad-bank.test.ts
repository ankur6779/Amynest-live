import { describe, it, expect } from "vitest";
import { olympiadBankCountBySubject, OLYMPIAD_QUESTIONS } from "@workspace/olympiad";

describe("olympiad global question bank", () => {
  it("has 500+ questions per subject", () => {
    const counts = olympiadBankCountBySubject();
    expect(counts.math).toBeGreaterThanOrEqual(500);
    expect(counts.science).toBeGreaterThanOrEqual(500);
    expect(counts.reasoning).toBeGreaterThanOrEqual(500);
    expect(counts.gk).toBeGreaterThanOrEqual(500);
  });

  it("questions are global-first (no India-only base rows)", () => {
    const indiaSpecific = OLYMPIAD_QUESTIONS.filter(
      (q) =>
        /₹|Diwali|rangoli|Jana Gana|Father of the Nation \(India\)|Wings of Fire|Rajasthan|Ganga|Tagore wrote our National/i.test(
          q.question + q.explanation,
        ) && q.countryCode !== "IN",
    );
    expect(indiaSpecific.length).toBe(0);
  });
});
