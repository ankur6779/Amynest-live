import { describe, expect, it } from "vitest";
import {
  livingArcAriaLabel,
  livingAutoSkipReasonDisplay,
  livingAutoSkipToastTitle,
  livingCompletionBody,
  livingCompletionTitle,
  livingContinuityExits,
  livingDayCompleteHeadline,
  livingHeroDoneTitle,
  livingLetGoLabel,
  livingMissedWindowHint,
  livingPresenceRingLabel,
  livingSkipBadgeLabel,
} from "./living-execution";

describe("routine-generation living-execution (R5)", () => {
  it("presence ring never shows percent / gamification language", () => {
    expect(livingPresenceRingLabel(0, 8)).toBe("Begin");
    expect(livingPresenceRingLabel(2, 8)).toBe("Gentle");
    expect(livingPresenceRingLabel(5, 8)).toBe("With");
    expect(livingPresenceRingLabel(8, 8)).toBe("Cared");
    expect(livingPresenceRingLabel(3, 8)).not.toMatch(/%|points|xp|level|streak|coin/);
  });

  it("completion celebrates care — not 100% / amazing work theatre", () => {
    const title = livingCompletionTitle().toLowerCase();
    const body = livingCompletionBody("Maya").toLowerCase();
    expect(title).toContain("cared");
    expect(body).toContain("maya");
    expect(`${title} ${body}`).not.toMatch(
      /\b(100%|amazing work|points|confetti|badge|xp|coins|streak)\b/,
    );
    expect(livingHeroDoneTitle().toLowerCase()).toContain("cared");
  });

  it("missed / skip language is grace — not guilt", () => {
    expect(livingMissedWindowHint().toLowerCase()).toMatch(/okay|gently|let/);
    expect(livingMissedWindowHint().toLowerCase()).not.toMatch(
      /\b(failed|punish|shame|behind|missed yesterday)\b/,
    );
    expect(livingSkipBadgeLabel().toLowerCase()).toContain("aside");
    expect(livingAutoSkipToastTitle().toLowerCase()).toContain("bedtime");
    expect(
      livingAutoSkipReasonDisplay("⏭️ Skipped — not enough time")?.toLowerCase(),
    ).toMatch(/bedtime|stepped aside/);
  });

  it("continuity exits reuse existing routes only — no catalogue/upsell", () => {
    const exits = livingContinuityExits();
    expect(exits.map((e) => e.id)).toEqual(["today", "hub", "coach", "audio"]);
    expect(exits.find((e) => e.id === "today")?.href).toBe("/dashboard");
    expect(exits.find((e) => e.id === "hub")?.href).toBe("/parenting-hub");
    expect(exits.find((e) => e.id === "coach")?.href).toBe("/amy-coach");
    expect(exits.find((e) => e.id === "audio")?.href).toBe("/audio-lessons");
    const joined = exits.map((e) => `${e.label} ${e.purpose}`).join(" ").toLowerCase();
    expect(joined).not.toMatch(/\b(browse more|explore|see all|upgrade|unlock|fomo)\b/);
  });

  it("arc aria is rhythm — not KPI day progress", () => {
    expect(livingArcAriaLabel().toLowerCase()).not.toContain("progress");
    expect(livingArcAriaLabel().toLowerCase()).toMatch(/rhythm|gentle|today/);
  });

  it("past-day and let-go copy stay care-first", () => {
    expect(livingDayCompleteHeadline().toLowerCase()).toMatch(/rest|cared|day/);
    expect(livingDayCompleteHeadline().toLowerCase()).not.toMatch(/\b(100%|points|streak)\b/);
    expect(livingLetGoLabel().toLowerCase()).toBe("let go");
  });
});
