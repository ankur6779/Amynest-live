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

  it("enriches facts with optional planet degrees without inventing missing ones", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Pisces",
      moonPhase: "waxing",
      moonPhaseLabel: "Waxing Crescent",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "What about Mercury?",
      entryPoint: "sky",
      mercury: { sign: "Virgo", lonDeg: 155.12, retrograde: true },
      retrograde: ["mercury"],
      kernel: "DE440",
      kernelFingerprint: "sha256:abcd",
      astronomyConfidence: 1.0,
      calculationMode: "topocentric",
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /mercury_sign=Virgo/);
    assert.match(blob, /mercury_lon_deg=155\.1200/);
    assert.match(blob, /retrograde=mercury/);
    assert.match(blob, /kernel=DE440/);
    assert.match(blob, /astronomy_confidence=1\.00/);
    assert.equal(blob.includes("birth_time"), false);
  });

  it("appends house system and planet house facts only", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Pisces",
      moonPhase: "waxing",
      moonPhaseLabel: "Waxing Crescent",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "What about the houses?",
      entryPoint: "sky",
      houseSystem: "whole_sign",
      planetHouseMap: { sun: 3, moon: 11, venus: 4 },
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /house_system=whole_sign/);
    assert.match(blob, /sun_house=3/);
    assert.match(blob, /moon_house=11/);
    assert.match(blob, /venus_house=4/);
  });

  it("adds cautious language guidance when birth inputs are missing", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "day_sky",
      timePrecision: "unknown",
      placeProvided: false,
      sunSign: "Cancer",
      moonSign: "Libra",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: null,
      childFirstName: "Ada",
      userQuestion: "What should I notice?",
      entryPoint: "sky",
      astronomyConfidence: 0.72,
      missingInputs: ["birthTime"],
      calculationMode: "geocentric",
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /astronomy_confidence=0\.72/);
    assert.match(blob, /missing_inputs=birthTime/);
    assert.match(blob, /language_guidance=use_cautious_language/);
  });

  it("includes recent conversation turns for continuity", () => {
    const assembled = assembleBirthSkyPrompt(
      {
        contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
        snapshotVersion: "ss_1",
        engineVersion: "eng_1",
        mode: "full",
        timePrecision: "exact",
        placeProvided: true,
        sunSign: "Leo",
        moonSign: "Pisces",
        moonPhase: "waxing",
        moonPhaseLabel: "Waxing Crescent",
        risingSign: "Virgo",
        childFirstName: "Maya",
        userQuestion: "Tell me more about belonging.",
        entryPoint: "reflect",
      },
      {
        recentTurns: [
          { role: "user", body: "What should I notice?" },
          { role: "assistant", body: "When I look at Maya's sky, Moon in Pisces softens belonging." },
        ],
      },
    );
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /Recent conversation/);
    assert.match(blob, /Moon in Pisces/);
    assert.match(blob, /120–280/);
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

  it("does not false-positive on poor sleep / rich inner world / ADHD-like language", () => {
    assert.equal(
      validateBirthSkyAiOutput("Poor sleep often softens mornings — try a calmer wind-down.").ok,
      true,
    );
    assert.equal(
      validateBirthSkyAiOutput("A rich inner world shows up in quiet play.").ok,
      true,
    );
    assert.equal(
      validateBirthSkyAiOutput(
        "ADHD-like focus swings are common — I am not diagnosing; try a shorter homework block.",
      ).ok,
      true,
    );
  });

  it("varies safety fallbacks by seed while staying truthful", () => {
    const a = validateBirthSkyAiOutput("Your child is destined to become a doctor.", {
      fallbackSeed: "job-a",
    });
    const b = validateBirthSkyAiOutput("Your child is destined to become a doctor.", {
      fallbackSeed: "job-b",
    });
    assert.equal(a.ok, false);
    assert.equal(b.ok, false);
    if (!a.ok && !b.ok) {
      assert.notEqual(a.fallback, b.fallback);
      assert.match(a.fallback, /predict|future|fate|destiny|reflective|sky/i);
      assert.doesNotMatch(a.fallback, /\b(Sun in|Moon in|Rising in)\b/);
    }
  });

  it("labels tradition when needed", () => {
    const r = validateBirthSkyAiOutput(
      "The nakshatra story speaks of gathering for families.",
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.match(r.text, /tradition|cultural/i);
  });
});
