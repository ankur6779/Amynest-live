import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildContractFixture,
  validateAiWorksheetResponse,
  parseAiWorksheetContractOrThrow,
  generateWorksheetLocal,
} from "@workspace/worksheet-studio";

describe("worksheet AI contract (api-server)", () => {
  it("validated contract never yields empty pages/questions", () => {
    const fixture = buildContractFixture();
    const v = validateAiWorksheetResponse(fixture);
    assert.equal(v.ok, true);
    const req = {
      prompt: "sea animals",
      classLevel: "ukg" as const,
      subject: "english" as const,
      difficulty: "easy" as const,
      pageCount: 1,
    };
    const local = generateWorksheetLocal(req);
    const doc = parseAiWorksheetContractOrThrow(fixture, req, local.id);
    assert.ok(doc.pages.length > 0);
    const questions = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "question_block"));
    assert.ok(questions.length > 0);
    for (const q of questions) {
      if (q.type === "question_block") assert.ok(q.prompt.trim().length > 0);
    }
  });

  it("invalid payload is rejected before parse", () => {
    const v = validateAiWorksheetResponse({ questions: [] });
    assert.equal(v.ok, false);
  });
});
