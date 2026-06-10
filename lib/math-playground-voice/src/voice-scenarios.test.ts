import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultVoiceScenarioAdapter,
  scenarioFromDivision,
  voiceScenarioFromActivity,
} from "./voice-scenarios.ts";

describe("math-playground-voice scenarios", () => {
  it("maps addition payload to voice scenario", () => {
    const scenario = voiceScenarioFromActivity("addition_lab", {
      augend: 3,
      addend: 2,
      objectKind: "apple",
    });
    assert.ok(scenario);
    assert.equal(scenario!.kind, "addition");
    assert.deepEqual(scenario!.expectedAnswers, [5]);
    assert.equal(scenario!.promptKey, "amy_voice_add");
  });

  it("maps division payload with fair share quotient", () => {
    const scenario = scenarioFromDivision("division_bakery", {
      total: 12,
      recipients: 3,
      objectKind: "cookie",
    });
    assert.equal(scenario.expectedAnswers[0], 4);
    assert.equal(scenario.promptKey, "amy_voice_divide");
  });

  it("returns null for unsupported activities", () => {
    const scenario = defaultVoiceScenarioAdapter.fromPayload("math_puzzles", {
      template: "bigger_number",
      leftValue: 3,
      rightValue: 7,
    });
    assert.equal(scenario, null);
  });
});
