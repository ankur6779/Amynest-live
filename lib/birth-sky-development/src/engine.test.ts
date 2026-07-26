import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEANING_ENGINE_VERSION,
  type MeaningSnapshot,
} from "@workspace/birth-sky-meaning";
import {
  DEVELOPMENT_ENGINE_VERSION,
  ageMonthsFromBirthDate,
  computeDevelopmentSnapshot,
  evaluateRoutines,
  resolveAgeStage,
} from "./index.js";

function sampleMeaning(overrides?: Partial<MeaningSnapshot>): MeaningSnapshot {
  return {
    meaningEngineVersion: MEANING_ENGINE_VERSION,
    generatedAt: "2026-01-01T00:00:00.000Z",
    profile: {
      learningStyle: ["practical learning"],
      communicationStyle: ["verbal"],
      creativeStrength: ["self-expression"],
      attentionPattern: ["fast-paced"],
      emotionalProfile: ["emotional attunement"],
      socialProfile: ["helpful"],
      strengths: ["confidence", "leadership"],
      comfortNeeds: ["predictable routines"],
      motivationStyle: ["visibility"],
      curiosityPattern: ["curiosity"],
    },
    parentingGuidance: [
      {
        conceptId: "leadership",
        guidanceId: "offer_choices",
        label: "Give opportunities to make choices",
        confidence: 0.9,
      },
    ],
    conflicts: [],
    categories: {
      strengths: [],
      learningStyle: [],
      communicationStyle: [],
      socialStyle: [],
      comfortNeeds: [],
      motivationStyle: [],
      creativeStyle: [],
      emotionalPattern: [],
      attentionPattern: [],
      curiosityPattern: [],
    },
    ...overrides,
  };
}

describe("DevelopmentEngine", () => {
  it("maps age months to correct stages", () => {
    assert.equal(resolveAgeStage(3).id, "infant_0_6");
    assert.equal(resolveAgeStage(9).id, "infant_6_12");
    assert.equal(resolveAgeStage(18).id, "toddler_1_2");
    assert.equal(resolveAgeStage(30).id, "toddler_2_3");
    assert.equal(resolveAgeStage(48).id, "preschool_3_5");
    assert.equal(resolveAgeStage(72).id, "school_5_8");
    assert.equal(resolveAgeStage(120).id, "school_8_12");
    assert.equal(resolveAgeStage(160).id, "teen_12_18");
  });

  it("computes age months from birth date deterministically", () => {
    const months = ageMonthsFromBirthDate("2020-01-15", "2026-01-15");
    assert.equal(months, 72);
  });

  it("versions development snapshots", () => {
    const snap = computeDevelopmentSnapshot({
      meaning: sampleMeaning(),
      ageMonths: 48,
      asOfDate: "2026-01-01",
    });
    assert.equal(snap.developmentEngineVersion, DEVELOPMENT_ENGINE_VERSION);
    assert.equal(snap.stage.id, "preschool_3_5");
  });

  it("generates development profile domain scores", () => {
    const snap = computeDevelopmentSnapshot({
      meaning: sampleMeaning(),
      ageMonths: 72,
    });
    assert.ok(snap.developmentProfile.confidence.score > 0.5);
    assert.ok(snap.developmentProfile.curiosity.score > 0.5);
    assert.ok(snap.profile.learningProfile.length > 0);
    assert.ok(snap.profile.emotionalProfile.length >= 0);
  });

  it("ranks priorities using parent goals", () => {
    const snap = computeDevelopmentSnapshot({
      meaning: sampleMeaning(),
      ageMonths: 72,
      parentGoals: ["better_focus", "better_sleep"],
    });
    assert.ok(snap.priorityAreas.length >= 3);
    assert.equal(snap.priorityAreas[0]!.rank, 1);
    const blob = snap.priorityAreas.map((p) => p.reason).join(" ");
    assert.match(blob, /parent_goal=/);
    assert.ok(snap.profile.topPriorities.length > 0);
  });

  it("evaluates routines for strengths and gaps", () => {
    const stage = resolveAgeStage(72);
    const alignment = evaluateRoutines({
      stage,
      routines: [
        { kind: "sleep", present: true },
        { kind: "reading", present: true },
      ],
    });
    assert.ok(alignment.strengths.length >= 1);
    assert.ok(alignment.missingOpportunities.some((m) => m.startsWith("missing_")));
    assert.ok(alignment.priorityRanking.length > 0);
  });

  it("includes recommended activities and parent actions", () => {
    const snap = computeDevelopmentSnapshot({
      meaning: sampleMeaning(),
      ageMonths: 48,
      routines: [{ kind: "play" }, { kind: "sleep" }],
      parentGoals: ["confidence"],
    });
    assert.ok(snap.recommendedActivities.length > 0);
    assert.ok(snap.recommendedParentActions.length > 0);
    assert.ok(snap.avoidPatterns.length > 0);
    assert.ok(snap.confidence > 0 && snap.confidence <= 1);
  });

  it("is deterministic for the same developmental input", () => {
    const input = {
      meaning: sampleMeaning(),
      ageMonths: 60,
      parentGoals: ["learning_habits" as const],
      routines: [{ kind: "focus" as const }, { kind: "outdoor" as const }],
      milestones: ["first words"],
      asOfDate: "2026-01-01",
    };
    const a = computeDevelopmentSnapshot(input);
    const b = computeDevelopmentSnapshot(input);
    assert.deepEqual(a.profile, b.profile);
    assert.deepEqual(a.priorityAreas, b.priorityAreas);
    assert.deepEqual(a.routineAlignment, b.routineAlignment);
    assert.equal(a.developmentEngineVersion, b.developmentEngineVersion);
  });

  it("returns existing snapshot when version matches (compat)", () => {
    const first = computeDevelopmentSnapshot({
      meaning: sampleMeaning(),
      ageMonths: 36,
    });
    const second = computeDevelopmentSnapshot({
      meaning: sampleMeaning({
        profile: {
          ...sampleMeaning().profile,
          strengths: ["curiosity"],
        },
      }),
      ageMonths: 100,
      developmentSnapshot: first,
    });
    assert.equal(second.ageMonths, first.ageMonths);
    assert.deepEqual(second.profile, first.profile);
  });
});
