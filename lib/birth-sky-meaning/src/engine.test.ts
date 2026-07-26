import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONFLICT_PAIRS,
  MEANING_ENGINE_VERSION,
  computeMeaningSnapshot,
  evaluateRules,
  mergeRuleHits,
  withMeaningSnapshot,
} from "./index.js";

describe("MeaningEngine", () => {
  it("versions meaning snapshots", () => {
    const snap = computeMeaningSnapshot({
      sunSign: "Leo",
      moonSign: "Cancer",
      risingSign: "Virgo",
    });
    assert.equal(snap.meaningEngineVersion, MEANING_ENGINE_VERSION);
    assert.ok(snap.generatedAt);
  });

  it("evaluates sun-in-leo style concepts", () => {
    const hits = evaluateRules({ sunSign: "Leo", moonSign: "Pisces" });
    const ids = new Set(hits.map((h) => h.conceptId));
    assert.ok(ids.has("confidence"));
    assert.ok(ids.has("leadership"));
    assert.ok(ids.has("self_expression"));
    assert.ok(ids.has("visibility"));
  });

  it("merges duplicates and ranks by confidence", () => {
    const { categories } = mergeRuleHits([
      {
        ruleId: "a",
        category: "strengths",
        conceptId: "confidence",
        label: "confidence",
        confidence: 0.7,
        evidence: "x",
      },
      {
        ruleId: "b",
        category: "strengths",
        conceptId: "confidence",
        label: "confidence",
        confidence: 0.9,
        evidence: "y",
      },
      {
        ruleId: "c",
        category: "strengths",
        conceptId: "leadership",
        label: "leadership",
        confidence: 0.8,
        evidence: "z",
      },
    ]);
    assert.equal(categories.strengths[0]?.id, "confidence");
    assert.ok((categories.strengths[0]?.confidence ?? 0) >= 0.9);
    assert.ok((categories.strengths[0]?.sources.length ?? 0) >= 2);
  });

  it("records conflicts without deleting either side", () => {
    const { categories, conflicts } = mergeRuleHits([
      {
        ruleId: "a",
        category: "attentionPattern",
        conceptId: "fast_pace",
        label: "fast-paced",
        confidence: 0.9,
        evidence: "a",
      },
      {
        ruleId: "b",
        category: "attentionPattern",
        conceptId: "gentle_pace",
        label: "gentle pace",
        confidence: 0.85,
        evidence: "b",
      },
    ]);
    assert.ok(CONFLICT_PAIRS.some(([a, b]) => a === "fast_pace" && b === "gentle_pace"));
    assert.ok(conflicts.length >= 1);
    assert.ok(categories.attentionPattern.some((t) => t.id === "fast_pace"));
    assert.ok(categories.attentionPattern.some((t) => t.id === "gentle_pace"));
    assert.ok(conflicts[0]?.kept.length === 2);
  });

  it("builds parenting guidance from concepts", () => {
    const snap = computeMeaningSnapshot({
      sunSign: "Leo",
      moonSign: "Cancer",
      planetHouseMap: { sun: 5 },
    });
    assert.ok(snap.parentingGuidance.length > 0);
    assert.ok(
      snap.parentingGuidance.some((g) =>
        g.label.toLowerCase().includes("choice"),
      ) ||
        snap.parentingGuidance.some((g) =>
          g.label.toLowerCase().includes("routine"),
        ),
    );
    assert.ok(snap.profile.strengths.length > 0);
  });

  it("attaches meaning without dropping astronomy fields", () => {
    const enriched = withMeaningSnapshot({
      sunSign: "Gemini",
      moonSign: "Sagittarius",
      astrologyMode: "western",
    });
    assert.equal(enriched.sunSign, "Gemini");
    assert.equal(enriched.meaningSnapshot.meaningEngineVersion, MEANING_ENGINE_VERSION);
    assert.ok(enriched.meaningSnapshot.profile.curiosityPattern.length > 0);
  });

  it("is deterministic for the same astronomy input", () => {
    const input = {
      sunSign: "Capricorn",
      moonSign: "Taurus",
      risingSign: "Libra",
      planetHouseMap: { sun: 10, moon: 2 },
      aspects: [
        { planetA: "sun", planetB: "jupiter", aspect: "trine", exactness: 0.9 },
      ],
    };
    const a = computeMeaningSnapshot(input);
    const b = computeMeaningSnapshot(input);
    assert.deepEqual(a.profile, b.profile);
    assert.deepEqual(a.categories.strengths.map((t) => t.id), b.categories.strengths.map((t) => t.id));
  });

  it("legacy astronomy without optional fields still produces a snapshot", () => {
    const snap = computeMeaningSnapshot({
      sunSign: "Aries",
      moonSign: "Aries",
      moonPhase: "new",
    });
    assert.equal(snap.meaningEngineVersion, MEANING_ENGINE_VERSION);
    assert.ok(snap.categories.strengths.length > 0);
  });
});
