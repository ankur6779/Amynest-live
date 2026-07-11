/**
 * P0 Editor State Synchronization Audit
 * Evidence only — does not modify AI, Parser, LayoutTree, Fabric geometry, PDF, DOCX.
 */
import type { WorksheetDocument } from "@workspace/worksheet-studio";

const LOG = "[EditorSyncAudit]";

export type EditorSyncChannel =
  | "WorksheetDocument"
  | "LayoutTree"
  | "Canvas"
  | "Page"
  | "Selection"
  | "React"
  | "Autosave"
  | "Branding"
  | "Reflow"
  | "Undo"
  | "History"
  | "DraftRestore"
  | "Other";

export type EditorSyncOp =
  | "draft_restore"
  | "autosave"
  | "branding"
  | "reflow"
  | "undo"
  | "redo"
  | "history"
  | "selection"
  | "canvas_render"
  | "document_change"
  | "page_change"
  | "teacher_intent"
  | "freeze"
  | "react_render"
  | "set_state"
  | "effect";

export type TimelineEntry = {
  seq: number;
  at: string;
  t: number;
  op: EditorSyncOp;
  channel: EditorSyncChannel;
  reason: string;
  stack?: string;
  detail?: Record<string, unknown>;
};

export type EditorSyncReport = {
  reactRenderCount: number;
  canvasRenderCount: number;
  expectedCanvasRenders: number;
  canvasRenderPass: boolean;
  frozen: boolean;
  automaticMutationDetected: boolean;
  automaticMutations: string[];
  firstCanvasRenderAt: string | null;
  timeline: TimelineEntry[];
  renderCountAfterInit: number;
  unexpectedRenders: string[];
};

function isAuditEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.has("editorSyncAudit") || q.has("layoutDebug")) return true;
  } catch { /* */ }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean((import.meta as any)?.env?.DEV);
  } catch {
    return false;
  }
}

function isDevThrowEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((import.meta as any)?.env?.PROD) return false;
  } catch { /* */ }
  return isAuditEnabled();
}

function captureStack(skip = 2): string {
  const err = new Error();
  const lines = (err.stack ?? "").split("\n").slice(skip, skip + 10);
  return lines.map((l) => l.trim()).join(" ← ");
}

function docFingerprint(doc: WorksheetDocument): string {
  return JSON.stringify({
    id: doc.id,
    v: doc.version,
    pages: doc.pages.map((p) =>
      p.elements.map((e) => ({
        id: e.id,
        t: e.type,
        x: e.x,
        y: e.y,
        w: e.width,
        h: e.height,
        c: e.type === "text" ? e.content : e.type === "question_block" ? e.prompt : undefined,
      })),
    ),
  });
}

export class EditorSyncAuditor {
  enabled = false;
  reactRenderCount = 0;
  canvasRenderCount = 0;
  seq = 0;
  timeline: TimelineEntry[] = [];
  frozen = false;
  freezeAt: string | null = null;
  freezeFingerprint: string | null = null;
  firstCanvasRenderAt: string | null = null;
  automaticMutations: string[] = [];
  private teacherIntent: string | null = null;
  private pendingRepaint = false;
  private initPaintDone = false;
  private rendersAfterInit = 0;
  unexpectedRenders: string[] = [];
  private effectPrevDeps = new Map<string, unknown[]>();
  private statePrev = new Map<string, unknown>();
  private startedAt = Date.now();

  constructor() {
    this.enabled = isAuditEnabled();
  }

  private push(
    op: EditorSyncOp,
    channel: EditorSyncChannel,
    reason: string,
    detail?: Record<string, unknown>,
    withStack = false,
  ) {
    if (!this.enabled) return;
    const entry: TimelineEntry = {
      seq: ++this.seq,
      at: new Date().toISOString(),
      t: Date.now() - this.startedAt,
      op,
      channel,
      reason,
      detail,
      stack: withStack ? captureStack(3) : undefined,
    };
    this.timeline.push(entry);
    if (this.timeline.length > 500) this.timeline.shift();
    console.info(`${LOG} #${entry.seq} +${entry.t}ms ${op} [${channel}] ${reason}`, detail ?? "", entry.stack ? `\n  ${entry.stack}` : "");
  }

  /** STEP 1 — every React render */
  logReactRender(reason: string) {
    if (!this.enabled) return;
    this.reactRenderCount += 1;
    this.push("react_render", "React", reason, { render: this.reactRenderCount }, true);
  }

  /** STEP 2 — setState channels */
  logSetState(channel: EditorSyncChannel, key: string, next: unknown) {
    if (!this.enabled) return;
    const prev = this.statePrev.get(key);
    this.statePrev.set(key, next);
    this.push(
      "set_state",
      channel,
      key,
      {
        old: summarize(prev),
        new: summarize(next),
      },
      true,
    );
  }

  /** STEP 3 — useEffect deps */
  logEffect(name: string, deps: unknown[]) {
    if (!this.enabled) return;
    const old = this.effectPrevDeps.get(name);
    this.effectPrevDeps.set(name, deps);
    this.push(
      "effect",
      "React",
      name,
      {
        dependencies: deps.map(summarize),
        old: old?.map(summarize),
        new: deps.map(summarize),
        changed: !old || old.length !== deps.length || old.some((v, i) => !Object.is(v, deps[i])),
      },
      true,
    );
  }

  /** STEP 4 — post-render operations */
  logOp(op: EditorSyncOp, channel: EditorSyncChannel, reason: string, detail?: Record<string, unknown>) {
    this.push(op, channel, reason, detail, true);
  }

  /**
   * STEP 6 — canvas render count.
   * After init paint, only teacher-allowed reasons may render.
   */
  logCanvasRender(reason: string, opts?: { allowed?: boolean; effect?: string; deps?: unknown[] }) {
    const isInit = reason === "initCanvas.first_render";
    this.canvasRenderCount += 1;
    if (isInit) {
      this.firstCanvasRenderAt = new Date().toISOString();
      this.initPaintDone = true;
      this.rendersAfterInit = 0;
    } else if (this.initPaintDone) {
      this.rendersAfterInit += 1;
    }

    const allowed =
      isInit ||
      opts?.allowed === true ||
      reason.startsWith("teacher:") ||
      reason.startsWith("page_change") ||
      reason.startsWith("export.") ||
      reason.includes("improve") ||
      reason.includes("history") ||
      reason.includes("undo") ||
      reason.includes("redo") ||
      reason.includes("copilot");

    if (this.enabled) {
      this.push(
        "canvas_render",
        "Canvas",
        reason,
        {
          canvasRender: this.canvasRenderCount,
          rendersAfterInit: this.rendersAfterInit,
          expectedAfterInit: 0,
          allowed,
          effect: opts?.effect,
        },
        true,
      );
    }

    if (this.initPaintDone && !isInit && !allowed) {
      this.assertUnexpectedRender(reason, opts?.effect, opts?.deps);
    }
  }

  /** STEP 8 — throw UnexpectedRenderAfterInitialization */
  assertUnexpectedRender(reason: string, effect?: string, deps?: unknown[]) {
    const msg = `UnexpectedRenderAfterInitialization: ${reason}`;
    this.unexpectedRenders.push(msg);
    console.error(`${LOG} ${msg}`, { effect, deps, stack: captureStack(3) });
    if (isDevThrowEnabled()) {
      throw new Error(
        `${msg}\neffect=${effect ?? "unknown"}\ndeps=${JSON.stringify(deps?.map(summarize) ?? [])}\n${captureStack(3)}`,
      );
    }
  }

  markInitPaintComplete() {
    this.initPaintDone = true;
    this.rendersAfterInit = 0;
    console.info(`${LOG} STEP7 Expected: Render #1 reason=initCanvas.first_render — no further automatic renders`);
  }

  get renderCountAfterInit() {
    return this.rendersAfterInit;
  }

  /** Teacher-initiated mutation + optional pending canvas repaint (default true). */
  allowTeacher(reason: string, opts?: { repaint?: boolean }) {
    this.teacherIntent = reason;
    if (opts?.repaint !== false) {
      this.pendingRepaint = true;
    }
    this.push("teacher_intent", "Other", reason, { repaint: opts?.repaint !== false });
  }

  consumeTeacherIntent(): string | null {
    const r = this.teacherIntent;
    this.teacherIntent = null;
    return r;
  }

  peekTeacherIntent(): string | null {
    return this.teacherIntent;
  }

  /** True if teacher requested a repaint; consumes the flag. */
  consumePendingRepaint(): boolean {
    const v = this.pendingRepaint;
    this.pendingRepaint = false;
    return v;
  }

  peekPendingRepaint(): boolean {
    return this.pendingRepaint;
  }

  requestTeacherRepaint(reason: string) {
    this.allowTeacher(reason, { repaint: true });
  }

  /**
   * STEP 5 — after first successful canvas render, freeze baseline.
   * Live document mutations without teacher intent fail in development.
   */
  markFirstSuccessfulRender(doc: WorksheetDocument) {
    if (this.frozen) {
      this.markInitPaintComplete();
      return;
    }
    this.frozen = true;
    this.freezeAt = new Date().toISOString();
    this.freezeFingerprint = docFingerprint(doc);
    try {
      freezeDeep(structuredClone(doc));
    } catch { /* */ }
    this.markInitPaintComplete();
    this.push("freeze", "WorksheetDocument", "first_successful_canvas_render", {
      fingerprint: this.freezeFingerprint.slice(0, 80),
      at: this.freezeAt,
    });
    console.info(`${LOG} STEP5 editor document baseline FROZEN after first successful render`);
  }

  /**
   * STEP 8 — document change gate.
   * Automatic mutation after freeze throws in development.
   */
  noteDocumentChange(doc: WorksheetDocument, sourceHint?: string): void {
    if (!this.enabled) return;
    const teacher = this.consumeTeacherIntent() ?? sourceHint ?? null;
    const fp = docFingerprint(doc);
    const changed = this.freezeFingerprint != null && fp !== this.freezeFingerprint;

    this.push("document_change", "WorksheetDocument", teacher ?? "automatic", {
      teacher: Boolean(teacher),
      frozen: this.frozen,
      fingerprintChanged: changed,
      version: doc.version,
    }, true);

    if (this.frozen && changed && !teacher) {
      const msg = `${LOG} AUTOMATIC WorksheetDocument mutation after successful render — FAIL (${sourceHint ?? "unknown"})`;
      this.automaticMutations.push(msg);
      console.error(msg, captureStack(3));
      if (isDevThrowEnabled()) {
        throw new Error(msg);
      }
    }

    if (teacher && changed) {
      // Teacher edit updates baseline so subsequent autosave noise isn't flagged.
      this.freezeFingerprint = fp;
    }
  }

  notePageChange(oldIndex: number, newIndex: number) {
    this.allowTeacher(`page_change ${oldIndex}→${newIndex}`, { repaint: false });
    this.push("page_change", "Page", `${oldIndex}→${newIndex}`);
  }

  /** STEP 7 — print full timeline */
  printTimeline() {
    if (!this.enabled) return;
    console.groupCollapsed(`${LOG} STEP7 FULL TIMELINE (${this.timeline.length} events)`);
    console.table(
      this.timeline.map((e) => ({
        seq: e.seq,
        tMs: e.t,
        op: e.op,
        channel: e.channel,
        reason: e.reason.slice(0, 60),
      })),
    );
    console.log("Pipeline order expected: AI→Parser→LayoutTree→Fabric→React→Autosave→Branding→Selection→History");
    console.groupEnd();
  }

  buildReport(): EditorSyncReport {
    return {
      reactRenderCount: this.reactRenderCount,
      canvasRenderCount: this.canvasRenderCount,
      expectedCanvasRenders: 1,
      canvasRenderPass: this.canvasRenderCount === 1 || (this.initPaintDone && this.rendersAfterInit === 0),
      frozen: this.frozen,
      automaticMutationDetected: this.automaticMutations.length > 0,
      automaticMutations: [...this.automaticMutations],
      firstCanvasRenderAt: this.firstCanvasRenderAt,
      timeline: [...this.timeline],
      renderCountAfterInit: this.rendersAfterInit,
      unexpectedRenders: [...this.unexpectedRenders],
    };
  }

  printReport() {
    const report = this.buildReport();
    console.groupCollapsed(`${LOG} FINAL REPORT`);
    console.log({
      CanvasRenders: `${report.canvasRenderCount} (expected 1 init)`,
      RendersAfterInit: `${report.renderCountAfterInit} (expected 0 automatic)`,
      Pass: report.canvasRenderPass && report.unexpectedRenders.length === 0 ? "PASS" : "FAIL",
      Frozen: report.frozen ? "YES" : "NO",
      AutomaticMutation: report.automaticMutationDetected ? "YES" : "NO",
      FirstCanvasRenderAt: report.firstCanvasRenderAt,
    });
    if (report.unexpectedRenders.length) {
      console.error("Unexpected renders:", report.unexpectedRenders);
    }
    console.groupEnd();
    this.printTimeline();
    return report;
  }

  downloadJson(filename = `editor-sync-audit-${Date.now()}.json`) {
    if (typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(this.buildReport(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function summarize(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === "object") {
    if (Array.isArray(v)) return `Array(${v.length})`;
    if ("id" in (v as object) && "pages" in (v as object)) {
      const d = v as WorksheetDocument;
      return `WorksheetDocument(id=${d.id},v=${d.version},pages=${d.pages.length})`;
    }
    return Object.prototype.toString.call(v);
  }
  if (typeof v === "function") return "fn";
  return v;
}

function freezeDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  for (const v of Object.values(value as Record<string, unknown>)) freezeDeep(v);
  return Object.freeze(value);
}

let active: EditorSyncAuditor | null = null;

export function beginEditorSyncAudit(): EditorSyncAuditor {
  active = new EditorSyncAuditor();
  if (active.enabled) {
    console.info(`${LOG} session started (editorSyncAudit / layoutDebug / DEV)`);
    (window as unknown as { __worksheetEditorSyncAudit?: EditorSyncAuditor }).__worksheetEditorSyncAudit = active;
  }
  return active;
}

export function getEditorSyncAudit(): EditorSyncAuditor | null {
  return active;
}

export function endEditorSyncAudit(): EditorSyncReport | null {
  if (!active) return null;
  const report = active.printReport();
  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("editorSyncAudit")
  ) {
    active.downloadJson();
  }
  active = null;
  return report;
}

/** Stable no-op auditor when disabled (avoids null checks at call sites). */
export function getEditorSyncAuditOrStub(): EditorSyncAuditor {
  return active ?? new EditorSyncAuditor();
}
