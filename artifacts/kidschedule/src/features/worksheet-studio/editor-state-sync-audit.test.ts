import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  EditorSyncAuditor,
  beginEditorSyncAudit,
  endEditorSyncAudit,
  getEditorSyncAudit,
  requestEditorDocumentRepaint,
} from "./editor-state-sync-audit";
import { generateWorksheetLocal } from "@workspace/worksheet-studio";

const REQ = {
  prompt: "test",
  classLevel: "ukg" as const,
  subject: "english" as const,
  difficulty: "easy" as const,
  pageCount: 1,
};

describe("EditorSyncAuditor", () => {
  beforeEach(() => {
    endEditorSyncAudit();
    vi.stubGlobal("window", {
      location: { search: "?editorSyncAudit=1" },
      document: { createElement: () => ({ click: () => {}, href: "", download: "" }) },
      URL: { createObjectURL: () => "blob:x", revokeObjectURL: () => {} },
    });
  });

  it("counts canvas renders and flags unexpected after init", () => {
    const a = beginEditorSyncAudit();
    expect(a.enabled).toBe(true);
    a.logCanvasRender("initCanvas.first_render", { allowed: true });
    expect(a.renderCountAfterInit).toBe(0);
    expect(() =>
      a.logCanvasRender("effect.document.version", { allowed: false, effect: "document.version→renderPage" }),
    ).toThrow(/UnexpectedRenderAfterInitialization/);
    endEditorSyncAudit();
  });

  it("allows teacher-tagged renders after init", () => {
    const a = beginEditorSyncAudit();
    a.logCanvasRender("initCanvas.first_render", { allowed: true });
    expect(() =>
      a.logCanvasRender("teacher:token=1.page=0", { allowed: true }),
    ).not.toThrow();
    expect(a.renderCountAfterInit).toBe(1);
    endEditorSyncAudit();
  });

  it("freezes baseline and throws on automatic mutation in audit mode", () => {
    const a = beginEditorSyncAudit();
    const doc = generateWorksheetLocal(REQ);
    a.markFirstSuccessfulRender(doc);
    expect(a.frozen).toBe(true);

    const mutated = {
      ...doc,
      version: doc.version + 1,
      meta: { ...doc.meta, updatedAt: new Date().toISOString() },
    };
    expect(() => a.noteDocumentChange(mutated)).toThrow(/AUTOMATIC WorksheetDocument mutation/);
    endEditorSyncAudit();
  });

  it("allows teacher-initiated mutation after freeze", () => {
    const a = beginEditorSyncAudit();
    const doc = generateWorksheetLocal(REQ);
    a.markFirstSuccessfulRender(doc);
    a.allowTeacher("canvas_edit_sync");
    const mutated = {
      ...doc,
      version: doc.version + 1,
      meta: { ...doc.meta, updatedAt: new Date().toISOString() },
    };
    expect(() => a.noteDocumentChange(mutated)).not.toThrow();
    expect(a.automaticMutations).toHaveLength(0);
    endEditorSyncAudit();
  });

  it("logs effect dependency transitions", () => {
    const a = beginEditorSyncAudit();
    a.logEffect("document.version→renderPage", [1, "color"]);
    a.logEffect("document.version→renderPage", [2, "color"]);
    const effects = a.timeline.filter((e) => e.op === "effect");
    expect(effects).toHaveLength(2);
    expect((effects[1]!.detail as { changed?: boolean }).changed).toBe(true);
    endEditorSyncAudit();
  });

  it("begin/get/end session lifecycle", () => {
    beginEditorSyncAudit();
    expect(getEditorSyncAudit()).toBeInstanceOf(EditorSyncAuditor);
    const report = endEditorSyncAudit();
    expect(report).not.toBeNull();
    expect(getEditorSyncAudit()).toBeNull();
  });

  it("requestEditorDocumentRepaint sets pending repaint for in-place document swaps", () => {
    endEditorSyncAudit();
    requestEditorDocumentRepaint("copilot_apply");
    const audit = getEditorSyncAudit();
    expect(audit).toBeInstanceOf(EditorSyncAuditor);
    expect(audit!.consumePendingRepaint()).toBe(true);
    endEditorSyncAudit();
  });
});
