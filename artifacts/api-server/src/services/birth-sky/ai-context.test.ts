import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assembleBirthSkyPrompt,
  assertSupportedContextSchema,
} from "./ai-context.js";
import { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "./ai-constants.js";
import { validateBirthSkyAiOutput } from "./ai-safety.js";

describe("birth-sky ai context", () => {
  it("supports current context schema only", () => {
    assert.equal(assertSupportedContextSchema(BIRTH_SKY_CONTEXT_SCHEMA_VERSION), true);
    assert.equal(assertSupportedContextSchema("nope"), false);
  });

  it("assembles prompt without birth time/place/journal body", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "eng_1",
      mode: "day_sky",
      timePrecision: "unknown",
      placeProvided: true,
      sunSign: "Cancer",
      moonSign: "Libra",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: null,
      traditionalContentVersion: "tradition_pack/1.0.0",
      reflectionIds: ["r1"],
      reflectionCount: 1,
      childFirstName: "Ada",
      userQuestion: "What should I notice tonight?",
      entryPoint: "reflect",
    });
    const blob = JSON.stringify(assembled.messages);
    assert.equal(blob.includes("birth_time"), false);
    assert.equal(blob.includes("latitude"), false);
    assert.equal(blob.includes("journal"), false);
    assert.match(blob, /Day Sky/);
    assert.match(blob, /ss_1/);
  });
});

describe("birth-sky ai safety", () => {
  it("blocks medical/prediction claims", () => {
    const r = validateBirthSkyAiOutput("Your child is destined to become a doctor.");
    assert.equal(r.ok, false);
  });

  it("allows zodiac Cancer and ordinary will-be parenting language", () => {
    const zodiac = validateBirthSkyAiOutput(
      "With Moon in Cancer themes in their sky story, belonging often softens their nervous system — curiosity will be a gift when you stay near.",
    );
    assert.equal(zodiac.ok, true);

    const medical = validateBirthSkyAiOutput(
      "Your child may develop cancer according to this chart.",
    );
    assert.equal(medical.ok, false);
    if (!medical.ok) assert.equal(medical.code, "medical");

    const willBecome = validateBirthSkyAiOutput("Your child will become a doctor.");
    assert.equal(willBecome.ok, false);
  });

  it("labels tradition when needed", () => {
    const r = validateBirthSkyAiOutput(
      "The nakshatra story speaks of gathering for families.",
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.match(r.text, /tradition|cultural/i);
  });
});
