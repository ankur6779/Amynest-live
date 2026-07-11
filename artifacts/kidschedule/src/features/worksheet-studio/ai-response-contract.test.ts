import { describe, expect, it, beforeEach } from "vitest";
import {
  validateAiWorksheetResponse,
  buildContractFixture,
  parseAiWorksheetContractOrThrow,
  parseAiWorksheetResponse,
  buildDocumentFromAiJson,
  generateWorksheetLocal,
  getAiContractHealth,
  resetAiContractHealth,
  recordAiContractAttempt,
  WORKSHEET_SCHEMA_VERSION,
  WORKSHEET_LAYOUT_VERSION,
  AI_WORKSHEET_GENERATOR_VERSION,
  fingerprintDocument,
} from "@workspace/worksheet-studio";

const REQ = {
  prompt: "sea animals UKG",
  classLevel: "ukg" as const,
  subject: "phonics" as const,
  difficulty: "easy" as const,
  pageCount: 1,
};

describe("AI response contract", () => {
  beforeEach(() => {
    resetAiContractHealth();
  });

  it("accepts a complete canonical contract", () => {
    const fixture = buildContractFixture();
    const result = validateAiWorksheetResponse(fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schemaVersion).toBe(WORKSHEET_SCHEMA_VERSION);
      expect(result.data.layoutVersion).toBe(WORKSHEET_LAYOUT_VERSION);
      expect(result.data.generatorVersion).toBe(AI_WORKSHEET_GENERATOR_VERSION);
      expect(result.data.pages.length).toBeGreaterThan(0);
      expect(result.data.questions.length).toBeGreaterThan(0);
    }
  });

  it("rejects 0 questions / missing required root fields — no partial recovery", () => {
    expect(validateAiWorksheetResponse({ title: "x", questions: [] }).ok).toBe(false);
    expect(validateAiWorksheetResponse(null).ok).toBe(false);
    expect(
      validateAiWorksheetResponse({
        ...buildContractFixture(),
        questions: [],
        pages: [{ pageNumber: 1, questionIds: ["q1"] }],
      }).ok,
    ).toBe(false);
  });

  it("rejects schemaVersion / generatorVersion mismatch", () => {
    const bad = {
      ...buildContractFixture(),
      schemaVersion: 99,
    };
    expect(validateAiWorksheetResponse(bad).ok).toBe(false);

    const badGen = {
      ...buildContractFixture(),
      generatorVersion: "old-v0",
    };
    expect(validateAiWorksheetResponse(badGen).ok).toBe(false);
  });

  it("rejects missing prompts and duplicate IDs", () => {
    const missingPrompt = buildContractFixture();
    missingPrompt.questions[0]!.prompt = "   ";
    expect(validateAiWorksheetResponse(missingPrompt).ok).toBe(false);

    const dup = buildContractFixture({
      questions: [
        {
          id: "q1",
          questionType: "colour",
          prompt: "A",
          pageNumber: 1,
          options: null,
          answerLine: false,
          illustrationEmoji: null,
          illustrationLabel: null,
          answer: null,
        },
        {
          id: "q1",
          questionType: "count",
          prompt: "B",
          pageNumber: 1,
          options: null,
          answerLine: false,
          illustrationEmoji: null,
          illustrationLabel: null,
          answer: null,
        },
      ],
      pages: [{ pageNumber: 1, questionIds: ["q1", "q1"] }],
    });
    expect(validateAiWorksheetResponse(dup).ok).toBe(false);
  });

  it("strict parser throws on invalid — never returns broken document", () => {
    const fallback = generateWorksheetLocal(REQ);
    expect(() => parseAiWorksheetContractOrThrow({ questions: [] }, REQ, fallback.id)).toThrow(
      /contract invalid/i,
    );
    expect(() => parseAiWorksheetResponse({ title: "x" }, REQ, fallback)).toThrow();
  });

  it("strict parser builds a valid WorksheetDocument from contract", () => {
    const fixture = buildContractFixture();
    const fallback = generateWorksheetLocal(REQ);
    const doc = parseAiWorksheetContractOrThrow(fixture, REQ, fallback.id);
    const fp = fingerprintDocument(doc);
    expect(fp.pages).toBeGreaterThan(0);
    expect(fp.questions).toBeGreaterThan(0);
    expect(fp.promptCount).toBe(fp.questions);
    expect(fp.duplicateIds).toEqual([]);
  });

  it("buildDocumentFromAiJson returns null for legacy/invalid payloads", () => {
    expect(buildDocumentFromAiJson({ questions: [{ type: "colour", prompt: "x" }] }, REQ, "id")).toBeNull();
  });

  it("health metrics track success / failure / fallback", () => {
    recordAiContractAttempt({ success: true, retryCount: 1, usedRetry: true });
    recordAiContractAttempt({ success: false, schemaFailure: true, usedFallback: true, retryCount: 2 });
    const health = getAiContractHealth();
    expect(health.attempts).toBe(2);
    expect(health.successes).toBe(1);
    expect(health.schemaFailures).toBe(1);
    expect(health.fallbacks).toBe(1);
    expect(health.aiSuccessPercent).toBe(50);
    expect(health.averageRetryCount).toBe(1.5);
  });
});
