import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  PARENTING_KNOWLEDGE_SCHEMA_VERSION,
  compareKnowledge,
  freezeKnowledge,
  validateKnowledge,
  type KnowledgeDefinition,
} from "./index";

function sampleKnowledge(
  overrides: Partial<KnowledgeDefinition> = {},
): KnowledgeDefinition {
  return freezeKnowledge({
    knowledgeId: "knowledge.sample.problem.v1",
    problemId: "sample.problem.sample_problem",
    ageBands: ["age.2_3y", "age.3_5y"],
    difficulty: "difficulty.medium",
    rootCauses: ["cause.overstimulation", "cause.inconsistent_cues"],
    understanding: ["understand.trigger_map", "understand.need_vs_want"],
    corePrinciples: ["principle.predictable_routine", "principle.co_regulation"],
    coachObjectives: ["objective.reduce_resistance", "objective.build_ritual"],
    recommendedActions: ["action.wind_down_20m", "action.same_cue_order"],
    mistakesToAvoid: ["mistake.screen_before_bed", "mistake.inconsistent_bedtime"],
    microTasks: ["task.dim_lights", "task.one_story"],
    reflectionQuestions: ["reflect.what_worked", "reflect.energy_at_bedtime"],
    successSignals: ["signal.shorter_protest", "signal.falls_asleep_faster"],
    relatedProblems: ["sample.problem.other"],
    contentIds: ["content.sample.sample_problem.v1"],
    version: "v1",
    ...overrides,
  });
}

describe("Parenting Knowledge Schema (Phase 2.0)", () => {
  it("schema version constant", () => {
    expect(PARENTING_KNOWLEDGE_SCHEMA_VERSION).toBe("parenting_knowledge.v1");
  });

  it("validateKnowledge accepts structured ids", () => {
    const k = sampleKnowledge();
    expect(validateKnowledge(k).ok).toBe(true);
  });

  it("validateKnowledge rejects prose / missing fields", () => {
    expect(validateKnowledge(null).ok).toBe(false);
    expect(
      validateKnowledge(
        sampleKnowledge({
          recommendedActions: ["Please help the child sleep calmly tonight."],
        }),
      ).ok,
    ).toBe(false);
    expect(
      validateKnowledge(sampleKnowledge({ knowledgeId: "" })).ok,
    ).toBe(false);
  });

  it("compareKnowledge + freezeKnowledge", () => {
    const a = sampleKnowledge();
    const b = sampleKnowledge();
    expect(compareKnowledge(a, b)).toEqual([]);
    expect(Object.isFrozen(a)).toBe(true);

    const changed = sampleKnowledge({
      difficulty: "difficulty.high",
    });
    const diffs = compareKnowledge(a, changed);
    expect(diffs.some((d) => d.path === "difficulty")).toBe(true);
  });

  it("never imports Brain / Resolver / Template / SDK / packs / React", () => {
    const dir = join(__dirname);
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    for (const file of files) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src).not.toMatch(/from ["']@\/v2\/amy-brain/);
      expect(src).not.toMatch(/from ["']@\/v2\/amy-decision/);
      expect(src).not.toMatch(/from ["']@\/v2\/experience-resolver/);
      expect(src).not.toMatch(/from ["']@\/v2\/experience-template/);
      expect(src).not.toMatch(/from ["']@\/v2\/parenting-domain-sdk/);
      expect(src).not.toMatch(/from ["']@\/v2\/experience-packs/);
      expect(src).not.toMatch(/from ["']react["']/);
    }
  });
});
