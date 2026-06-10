import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateVoiceAnswer } from "./answer-validator.ts";
import { scenarioFromAddition, scenarioFromCounting } from "./voice-scenarios.ts";

describe("math-playground-voice answer-validator", () => {
  it("accepts digit answers", () => {
    const scenario = scenarioFromAddition("addition_lab", {
      augend: 3,
      addend: 2,
      objectKind: "apple",
    });
    const result = validateVoiceAnswer("five", scenario, { sttMode: "native" });
    assert.equal(result.outcome, "correct");
    assert.equal(result.parsedValue, 5);
  });

  it("accepts word number answers", () => {
    const scenario = scenarioFromCounting("counting_adventure", {
      targetCount: 5,
      objectKind: "apple",
      objects: [],
    });
    const result = validateVoiceAnswer("I see five apples", scenario);
    assert.equal(result.outcome, "correct");
    assert.equal(result.parsedValue, 5);
  });

  it("returns unparseable for empty transcript", () => {
    const scenario = scenarioFromCounting("counting_adventure", {
      targetCount: 3,
      objectKind: "star",
      objects: [],
    });
    const result = validateVoiceAnswer("   ", scenario);
    assert.equal(result.outcome, "unparseable");
  });

  it("marks wrong answers incorrect", () => {
    const scenario = scenarioFromAddition("addition_lab", {
      augend: 3,
      addend: 2,
      objectKind: "apple",
    });
    const result = validateVoiceAnswer("four", scenario);
    assert.equal(result.outcome, "incorrect");
    assert.equal(result.parsedValue, 4);
  });
});
