import { describe, expect, it } from "vitest";
import {
  beginLivePipelineSession,
  endLivePipelineSession,
  fingerprintDocument,
  diffFingerprints,
  validateParsedDocument,
  evaluateDraftSchema,
  buildStaticIntegrityWorksheet,
  parseAiWorksheetContractOrThrow,
  buildContractFixture,
  generateWorksheetLocal,
  WORKSHEET_SCHEMA_VERSION,
  WORKSHEET_LAYOUT_VERSION,
} from "@workspace/worksheet-studio";

const REQ = {
  prompt: "sea animals UKG",
  classLevel: "ukg" as const,
  subject: "phonics" as const,
  difficulty: "easy" as const,
  pageCount: 1,
};

describe("Live AI pipeline audit", () => {
  it("STEP1–3: validated contract → parse → fingerprint; static path PASS", () => {
    const session = beginLivePipelineSession();
    const fixture = buildContractFixture();
    session.captureRaw(fixture, { responseId: "test_1", model: "fixture", pageCountHint: 1 });
    expect(session.rawApi?.questionCount).toBe(2);

    const fallback = generateWorksheetLocal(REQ);
    const finalized = parseAiWorksheetContractOrThrow(fixture, REQ, fallback.id);
    session.captureStage("parsed_document", finalized);
    const validation = validateParsedDocument(finalized, REQ);
    expect(validation.ok).toBe(true);
    expect(validation.fingerprint.questions).toBeGreaterThan(0);

    const report = endLivePipelineSession();
    expect(report?.staticPath).toBe("PASS");
    expect(fingerprintDocument(buildStaticIntegrityWorksheet()).questions).toBeGreaterThan(0);
  });

  it("STEP2: invalid contract throws — never returns broken doc", () => {
    const session = beginLivePipelineSession();
    session.captureRaw({ title: "x", questions: [] }, { responseId: "empty" });
    const fallback = generateWorksheetLocal(REQ);
    expect(() => parseAiWorksheetContractOrThrow({ title: "x", questions: [] }, REQ, fallback.id)).toThrow();
    expect(session.firstCorruptionStage).toBe("raw_api→parsed_document");
    endLivePipelineSession();
  });

  it("STEP4: draft restore fingerprint compare detects mutation", () => {
    const session = beginLivePipelineSession();
    const before = buildStaticIntegrityWorksheet();
    const after = structuredClone(before);
    const q = after.pages[0]!.elements.find((e) => e.type === "question_block");
    if (q && q.type === "question_block") q.prompt = "";
    session.recordDraftRestore({
      restored: true,
      draftId: "d1",
      schemaVersion: 1,
      layoutVersion: 1,
      before,
      after,
    });
    expect(session.firstCorruptionStage).toBe("draft_restore");
    expect(diffFingerprints(fingerprintDocument(before), fingerprintDocument(after)).length).toBeGreaterThan(0);
    endLivePipelineSession();
  });

  it("STEP7: legacy draft without schema never silent-migrates", () => {
    const doc = buildStaticIntegrityWorksheet();
    const gate = evaluateDraftSchema({ document: doc });
    expect(gate.compatible).toBe(false);
    expect(gate.decision).toBe("upgrade_copy");

    const current = evaluateDraftSchema({
      document: doc,
      schemaVersion: WORKSHEET_SCHEMA_VERSION,
      layoutVersion: WORKSHEET_LAYOUT_VERSION,
    });
    expect(current.compatible).toBe(true);
  });

  it("STEP6: adjacent stage diffs report first structural change", () => {
    const session = beginLivePipelineSession();
    const a = buildStaticIntegrityWorksheet();
    session.captureStage("parsed_document", a);
    const b = structuredClone(a);
    b.pages = b.pages.slice(0, 0);
    session.captureStage("client_received", b);
    expect(session.firstCorruptionStage).toBe("parsed_document→client_received");
    expect(session.diffs.some((d) => d.changed && d.diffs.some((x) => x.startsWith("pages:")))).toBe(true);
    endLivePipelineSession();
  });
});
