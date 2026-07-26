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
      meaningSnapshot: null, // legacy raw-fact path
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /mercury_sign=Virgo/);
    assert.match(blob, /mercury_lon_deg=155\.1200/);
    assert.match(blob, /retrograde=mercury/);
    assert.match(blob, /astronomy_confidence=1\.00/);
    assert.equal(blob.includes("birth_time"), false);
  });

  it("omits EvidenceSnapshot from LLM context by default", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "How can I support learning?",
      entryPoint: "sky",
      ageMonths: 72,
      includeEvidence: false,
    });
    const blob = JSON.stringify(assembled.messages);
    assert.equal(blob.includes("evidence_engine="), false);
  });

  it("includes EvidenceSnapshot when includeEvidence is true", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "How can I support learning?",
      entryPoint: "sky",
      ageMonths: 72,
      includeEvidence: true,
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /evidence_engine=evidence-engine\/1\.0\.0/);
    assert.match(blob, /evidence=/);
  });

  it("appends ConversationPlan facts for structured flow", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "How can I support learning and focus?",
      entryPoint: "sky",
      ageMonths: 72,
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /conversation_engine=conversation-engine\/1\.0\.0/);
    assert.match(blob, /conversation_intent=learning_guidance/);
    assert.match(blob, /conversation_depth=/);
    assert.match(blob, /conversation_tone=/);
    assert.match(blob, /conversation_priority=/);
    assert.match(blob, /conversation_avoid=/);
    assert.match(blob, /safety_flags=/);
    assert.match(blob, /no_absolute_predictions/);
  });

  it("skips ConversationPlan when explicitly null (compat)", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "How can I support learning?",
      entryPoint: "sky",
      meaningSnapshot: null,
      developmentSnapshot: null,
      adaptiveSnapshot: null,
      conversationPlan: null,
    });
    const blob = JSON.stringify(assembled.messages);
    assert.equal(blob.includes("conversation_engine="), false);
  });

  it("appends AdaptiveSnapshot facts after development", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "What should we try this week?",
      entryPoint: "sky",
      meaningSnapshot: {
        meaningEngineVersion: "meaning-engine/1.0.0",
        generatedAt: "2026-01-01T00:00:00.000Z",
        profile: {
          learningStyle: ["practical learning"],
          communicationStyle: ["verbal"],
          creativeStrength: ["self-expression"],
          attentionPattern: ["fast-paced"],
          emotionalProfile: ["emotional attunement"],
          socialProfile: ["helpful"],
          strengths: ["confidence"],
          comfortNeeds: ["predictable routines"],
          motivationStyle: ["visibility"],
          curiosityPattern: ["curiosity"],
        },
        parentingGuidance: [],
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
      },
      ageMonths: 72,
      adaptiveHistory: {
        sessionFrequency: { sessionsPerWeek: 5, avgSessionMinutes: 15 },
        completedRoutines: [
          { kind: "focus", count: 6, lastDayPart: "morning" },
        ],
        skippedRoutines: [{ kind: "focus", count: 1 }],
        activities: [{ type: "focus", completed: 6, skipped: 1, repeated: 2 }],
        parentFeedback: [{ signal: "child_enjoyed", targetType: "focus" }],
      },
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /adaptive_engine=adaptive-engine\/1\.0\.0/);
    assert.match(blob, /engagement_level=/);
    assert.match(blob, /preferred_activity_types=/);
    assert.match(blob, /recommended_session_length=/);
    assert.match(blob, /routine_health=/);
    assert.match(blob, /adaptation_priority=/);
    assert.equal(blob.includes("userId"), false);
    assert.equal(blob.includes("childId"), false);
  });

  it("appends DevelopmentSnapshot facts when age is provided", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "How can I support learning?",
      entryPoint: "sky",
      meaningSnapshot: {
        meaningEngineVersion: "meaning-engine/1.0.0",
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
        parentingGuidance: [],
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
      },
      ageMonths: 72,
      parentGoals: ["better_focus", "learning_habits"],
      routines: [{ kind: "sleep" }, { kind: "focus" }],
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /development_engine=development-engine\/1\.0\.0/);
    assert.match(blob, /development_stage=/);
    assert.match(blob, /top_priorities=/);
    assert.match(blob, /recommended_parent_actions=/);
    assert.match(blob, /learning_profile=/);
    assert.equal(blob.includes("mercury_lon_deg"), false);
  });

  it("prefers MeaningSnapshot facts over raw planet dumps", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Cancer",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "How can I support learning?",
      entryPoint: "sky",
      mercury: { sign: "Virgo", lonDeg: 155.12, retrograde: true },
      planetDegreesJson: '{"sun":{"eclipticLongitudeDeg":120}}',
      meaningSnapshot: {
        meaningEngineVersion: "meaning-engine/1.0.0",
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
      },
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /meaning_engine=meaning-engine\/1\.0\.0/);
    assert.match(blob, /learning_style=/);
    assert.match(blob, /strengths=confidence/);
    assert.match(blob, /Give opportunities to make choices/);
    assert.equal(blob.includes("mercury_lon_deg"), false);
    assert.equal(blob.includes("planet_degrees_json"), false);
  });

  it("appends western facts without redesigning prompts", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Leo",
      moonSign: "Taurus",
      moonPhase: "waxing",
      moonPhaseLabel: "Waxing Crescent",
      risingSign: "Scorpio",
      childFirstName: "Maya",
      userQuestion: "What stands out?",
      entryPoint: "sky",
      astrologyMode: "western",
      zodiacMode: "tropical",
      houseSystem: "placidus",
      planetHouseMap: { sun: 5, moon: 2 },
      ascendantSign: "Scorpio",
      mcSign: "Leo",
      dominantElement: "fire",
      dominantModality: "fixed",
      majorAspects: ["Sun Trine Jupiter", "Moon Square Mars"],
      meaningSnapshot: null,
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /astrology_mode=western/);
    assert.match(blob, /zodiac=tropical/);
    assert.match(blob, /house_system=placidus/);
    assert.match(blob, /sun_house=5/);
    assert.match(blob, /moon_house=2/);
    assert.match(blob, /ascendant=scorpio/);
    assert.match(blob, /mc=leo/);
    assert.match(blob, /dominant_element=fire/);
    assert.match(blob, /dominant_modality=fixed/);
    assert.match(blob, /Sun Trine Jupiter/);
  });

  it("appends vedic facts without redesigning prompts", () => {
    const assembled = assembleBirthSkyPrompt({
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      timePrecision: "exact",
      placeProvided: true,
      sunSign: "Gemini",
      moonSign: "Taurus",
      moonPhase: "waxing",
      moonPhaseLabel: "Waxing Crescent",
      risingSign: "Virgo",
      childFirstName: "Maya",
      userQuestion: "What about the Moon?",
      entryPoint: "sky",
      zodiacMode: "sidereal_lahiri",
      ayanamsaName: "lahiri",
      moonNakshatra: "Rohini",
      moonPada: 2,
      moonLord: "Moon",
      planetHouseMap: { rahu: 12, ketu: 6 },
      currentMahadasha: "Jupiter",
      currentAntardasha: "Saturn",
      meaningSnapshot: null,
    });
    const blob = JSON.stringify(assembled.messages);
    assert.match(blob, /zodiac=sidereal/);
    assert.match(blob, /ayanamsa=lahiri/);
    assert.match(blob, /moon_nakshatra=Rohini/);
    assert.match(blob, /moon_pada=2/);
    assert.match(blob, /moon_lord=Moon/);
    assert.match(blob, /rahu_house=12/);
    assert.match(blob, /ketu_house=6/);
    assert.match(blob, /current_mahadasha=Jupiter/);
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
      meaningSnapshot: null,
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
      meaningSnapshot: null,
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
