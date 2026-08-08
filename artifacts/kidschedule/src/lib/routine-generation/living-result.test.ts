import { describe, expect, it } from "vitest";
import {
  buildLivingDayArc,
  buildLivingWhyProof,
  livingResultBeginCta,
  livingResultOpen,
  livingResultRebuildCta,
  livingResultWhatLine,
  pickLivingFirstAction,
} from "./living-result";

describe("routine-generation living-result (R3)", () => {
  it("opens as shaped day — never AI theatre / dashboard / unlock", () => {
    const open = livingResultOpen("Maya");
    const joined =
      `${open.eyebrow} ${open.title} ${open.companionship} ${open.arrival}`.toLowerCase();
    expect(open.title).toContain("Maya");
    expect(joined).toMatch(/shaped|here it is|today/);
    expect(joined).not.toMatch(
      /\b(ai is thinking|patent|unlock|dashboard|sparkle|chain.of.thought|perfect for your child)\b/,
    );
  });

  it("CTAs are Begin / Rebuild — not Generate AI / Unlock", () => {
    expect(livingResultBeginCta().toLowerCase()).toBe("begin today");
    expect(livingResultRebuildCta().toLowerCase()).toContain("rebuild");
    expect(livingResultBeginCta().toLowerCase()).not.toMatch(/generate|unlock|magic/);
  });

  it("picks first meaningful action skipping completed blocks", () => {
    const first = pickLivingFirstAction([
      { time: "7:00 AM", activity: "Wake", status: "completed" },
      { time: "8:00 AM", activity: "Breakfast", status: "skipped" },
      { time: "9:00 AM", activity: "Outdoor play", duration: 30, category: "play" },
    ]);
    expect(first?.activity).toBe("Outdoor play");
    expect(first?.index).toBe(2);
  });

  it("builds a faithful morning/day/evening arc from item times", () => {
    const arc = buildLivingDayArc([
      { time: "7:30 AM", activity: "Wake & wash" },
      { time: "1:00 PM", activity: "Quiet time" },
      { time: "7:00 PM", activity: "Dinner" },
      { time: "8:30 PM", activity: "Bedtime story" },
    ]);
    expect(arc.map((s) => s.id)).toEqual(["morning", "day", "evening"]);
    expect(arc[0].items[0].activity).toBe("Wake & wash");
    expect(arc[2].items.map((i) => i.activity)).toEqual([
      "Dinner",
      "Bedtime story",
    ]);
  });

  it("why proof only uses verified adaptations / context — no invented praise", () => {
    const proofs = buildLivingWhyProof({
      adaptations: ["Shorter outdoor block for limited weather"],
      childName: "Leo",
      hasSchool: true,
      mood: "lazy",
      weatherOutdoor: "limited",
      goals: "More calm mornings",
      max: 4,
    });
    expect(proofs.length).toBeGreaterThan(0);
    expect(proofs[0].field).toBe("routine.adaptations");
    for (const p of proofs) {
      expect(p.source.length).toBeGreaterThan(3);
      expect(p.statement.toLowerCase()).not.toContain("perfect for your child");
      expect(p.statement.toLowerCase()).not.toMatch(/amy noticed you struggling/);
    }
  });

  it("does not invent school why when hasSchool unknown", () => {
    const proofs = buildLivingWhyProof({
      adaptations: [],
      hasSchool: null,
      mood: "normal",
      weatherOutdoor: null,
    });
    expect(proofs.some((p) => p.id === "school")).toBe(false);
  });

  it("what line names child and step count without generic praise", () => {
    const line = livingResultWhatLine("Sam", 8, "Sat, Aug 8");
    expect(line).toContain("Sam");
    expect(line).toContain("8");
    expect(line.toLowerCase()).not.toContain("perfect");
  });
});
