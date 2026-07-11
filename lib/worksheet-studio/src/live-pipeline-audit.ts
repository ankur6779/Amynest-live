/**
 * Live AI pipeline investigation — evidence only.
 * Does NOT modify Fabric, LayoutTree builder math, Flow Layout, or PDF renderer.
 */
import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";
import {
  dumpWorksheetDocument,
  dumpLayoutTreeCounts,
  auditDocumentToLayoutTree,
  buildStaticIntegrityWorksheet,
} from "./document-layout-integrity.js";
import { buildLayoutTree } from "./layout-tree.js";

export const WORKSHEET_SCHEMA_VERSION = 1;
export const WORKSHEET_LAYOUT_VERSION = 1;
export const WORKSHEET_GENERATOR_VERSION = "live-pipeline-audit-v1";

const LOG = "[LivePipelineAudit]";

export type DocumentFingerprint = {
  schemaVersion: number;
  layoutVersion: number;
  generatorVersion: string;
  documentId: string;
  documentVersion: number;
  pages: number;
  questions: number;
  illustrations: number;
  writingLines: number;
  images: number;
  texts: number;
  shapes: number;
  promptCount: number;
  geometryHash: string;
  questionIds: string[];
  duplicateIds: string[];
};

export type RawApiSnapshot = {
  capturedAt: string;
  responseId: string;
  model: string;
  schemaVersion: number;
  pageCountHint: number | null;
  questionCount: number;
  raw: unknown;
};

export type StageName =
  | "raw_api"
  | "parsed_document"
  | "after_finalize"
  | "client_received"
  | "after_branding"
  | "after_draft_restore"
  | "layout_tree"
  | "pre_render_assert";

export type StageSnapshot = {
  stage: StageName;
  at: string;
  fingerprint: DocumentFingerprint | null;
  dump: ReturnType<typeof dumpWorksheetDocument> | null;
  notes?: string;
};

export type StageDiff = {
  from: StageName;
  to: StageName;
  changed: boolean;
  diffs: string[];
};

export type LivePipelineReport = {
  staticPath: "PASS" | "FAIL";
  aiPath: "PASS" | "FAIL" | "UNKNOWN";
  draftRestore: "PASS" | "FAIL" | "N/A";
  mutationDetected: boolean;
  firstCorruptionStage: string | null;
  stages: StageSnapshot[];
  diffs: StageDiff[];
  rawApi: RawApiSnapshot | null;
  logs: string[];
};

export type ParserValidationResult = {
  ok: boolean;
  errors: string[];
  fingerprint: DocumentFingerprint;
};

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `fp_${(h >>> 0).toString(16)}`;
}

/** STEP 3 — document fingerprint (stable structural identity). */
export function fingerprintDocument(doc: WorksheetDocument): DocumentFingerprint {
  const dump = dumpWorksheetDocument(doc);
  const ids: string[] = [];
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  for (const page of doc.pages) {
    for (const el of page.elements) {
      ids.push(el.id);
      if (seen.has(el.id)) duplicateIds.push(el.id);
      seen.add(el.id);
    }
  }
  const geomParts: string[] = [];
  for (const page of doc.pages) {
    const qs = page.elements
      .filter((e) => e.type === "question_block")
      .sort((a, b) => a.y - b.y || a.x - b.x);
    for (const q of qs) {
      geomParts.push(
        `${q.questionNumber}|${q.x.toFixed(1)}|${q.y.toFixed(1)}|${q.width.toFixed(1)}|${q.height.toFixed(1)}|${q.prompt.slice(0, 40)}`,
      );
    }
  }
  return {
    schemaVersion: WORKSHEET_SCHEMA_VERSION,
    layoutVersion: WORKSHEET_LAYOUT_VERSION,
    generatorVersion: WORKSHEET_GENERATOR_VERSION,
    documentId: doc.id,
    documentVersion: doc.version,
    pages: dump.pages,
    questions: dump.questions,
    illustrations: dump.illustrations,
    writingLines: dump.writingLines,
    images: dump.images,
    texts: dump.texts,
    shapes: dump.shapes,
    promptCount: dump.prompts.filter((p) => p.trim().length > 0).length,
    geometryHash: hashString(geomParts.join(";")),
    questionIds: dump.questionDetails.map((q) => q.id),
    duplicateIds,
  };
}

export function diffFingerprints(a: DocumentFingerprint, b: DocumentFingerprint): string[] {
  const diffs: string[] = [];
  const keys: Array<keyof DocumentFingerprint> = [
    "pages",
    "questions",
    "illustrations",
    "writingLines",
    "images",
    "texts",
    "shapes",
    "promptCount",
    "geometryHash",
    "documentVersion",
  ];
  for (const k of keys) {
    if (a[k] !== b[k]) diffs.push(`${k}: ${String(a[k])} → ${String(b[k])}`);
  }
  if (a.questionIds.join(",") !== b.questionIds.join(",")) {
    diffs.push(`questionIds changed (${a.questionIds.length} → ${b.questionIds.length})`);
  }
  if (b.duplicateIds.length) diffs.push(`duplicateIds: ${b.duplicateIds.join(",")}`);
  return diffs;
}

/** STEP 1 — snapshot raw API JSON (no mutation). */
export function snapshotRawApiJson(
  raw: unknown,
  meta: { responseId?: string; model?: string; pageCountHint?: number },
): RawApiSnapshot {
  const questions = raw && typeof raw === "object" && Array.isArray((raw as { questions?: unknown }).questions)
    ? (raw as { questions: unknown[] }).questions.length
    : 0;
  return {
    capturedAt: new Date().toISOString(),
    responseId: meta.responseId ?? `raw_${Date.now()}`,
    model: meta.model ?? "unknown",
    schemaVersion: WORKSHEET_SCHEMA_VERSION,
    pageCountHint: meta.pageCountHint ?? null,
    questionCount: questions,
    raw: structuredClone(raw),
  };
}

/** STEP 2 — validate parsed WorksheetDocument. Throws never — returns errors (caller may throw). */
export function validateParsedDocument(doc: WorksheetDocument, req?: WorksheetGenerateRequest): ParserValidationResult {
  const errors: string[] = [];
  const fp = fingerprintDocument(doc);

  if (fp.pages <= 0) errors.push("pageCount is 0");
  if (fp.questions <= 0) errors.push("questionCount is 0");
  if (fp.promptCount !== fp.questions) {
    errors.push(`promptCount ${fp.promptCount} != questionCount ${fp.questions}`);
  }
  if (fp.duplicateIds.length) errors.push(`duplicate element ids: ${fp.duplicateIds.join(",")}`);

  for (const page of doc.pages) {
    for (const el of page.elements) {
      if (![el.x, el.y, el.width, el.height].every((n) => Number.isFinite(n))) {
        errors.push(`NaN geometry on ${el.id}`);
      }
      if (el.type === "question_block") {
        if (!el.prompt?.trim()) errors.push(`empty prompt on ${el.id}`);
        if (el.width <= 0 || el.height <= 0) errors.push(`invalid size on ${el.id}`);
      }
    }
  }

  if (req && fp.questions === 0) {
    errors.push("parser produced zero questions for AI request");
  }

  return { ok: errors.length === 0, errors, fingerprint: fp };
}

export function assertParsedDocumentOrThrow(doc: WorksheetDocument, req?: WorksheetGenerateRequest): DocumentFingerprint {
  const result = validateParsedDocument(doc, req);
  if (!result.ok) {
    const msg = `${LOG} PARSER VALIDATION FAILED — STOP: ${result.errors.join("; ")}`;
    console.error(msg);
    throw new Error(msg);
  }
  return result.fingerprint;
}

/** STEP 5 — deep-freeze document; mutations throw in development. */
export function freezeWorksheetDocument(doc: WorksheetDocument): WorksheetDocument {
  const freezeDeep = (value: unknown): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (Object.isFrozen(value)) return value;
    for (const v of Object.values(value as Record<string, unknown>)) freezeDeep(v);
    return Object.freeze(value);
  };
  return freezeDeep(structuredClone(doc)) as WorksheetDocument;
}

function isDevRuntime(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (import.meta as any)?.env;
    if (meta && typeof meta.DEV === "boolean") return meta.DEV;
  } catch { /* Node CJS */ }
  return typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
}

/** Freeze after all intentional transforms; nested writes throw in strict/dev. */
export function guardDocumentImmutability(doc: WorksheetDocument, label: string): WorksheetDocument {
  if (!isDevRuntime()) return doc;
  const frozen = freezeWorksheetDocument(doc);
  return new Proxy(frozen, {
    set() {
      throw new Error(`${LOG} IMMUTABILITY VIOLATION at ${label}: WorksheetDocument must not be mutated after creation`);
    },
    deleteProperty() {
      throw new Error(`${LOG} IMMUTABILITY VIOLATION at ${label}: attempted delete on WorksheetDocument`);
    },
  });
}

export class LivePipelineSession {
  rawApi: RawApiSnapshot | null = null;
  stages: StageSnapshot[] = [];
  diffs: StageDiff[] = [];
  logs: string[] = [];
  draftRestored = false;
  draftMeta: {
    draftId?: string;
    schemaVersion?: number;
    layoutVersion?: number;
    generatorVersion?: string;
    createdAt?: string;
  } | null = null;
  mutationDetected = false;
  firstCorruptionStage: string | null = null;

  log(msg: string) {
    this.logs.push(msg);
    console.info(`${LOG} ${msg}`);
  }

  captureRaw(raw: unknown, meta: { responseId?: string; model?: string; pageCountHint?: number }) {
    this.rawApi = snapshotRawApiJson(raw, meta);
    this.log(`STEP1 raw API questions=${this.rawApi.questionCount} model=${this.rawApi.model} id=${this.rawApi.responseId}`);
    return this.rawApi;
  }

  captureStage(stage: StageName, doc: WorksheetDocument | null, notes?: string) {
    const fingerprint = doc ? fingerprintDocument(doc) : null;
    const dump = doc ? dumpWorksheetDocument(doc) : null;
    const snap: StageSnapshot = {
      stage,
      at: new Date().toISOString(),
      fingerprint,
      dump,
      notes,
    };
    const prev = this.stages[this.stages.length - 1];
    if (prev?.fingerprint && fingerprint) {
      const diffs = diffFingerprints(prev.fingerprint, fingerprint);
      const changed = diffs.length > 0;
      this.diffs.push({ from: prev.stage, to: stage, changed, diffs });
      if (changed) {
        this.mutationDetected = true;
        if (!this.firstCorruptionStage) {
          // Branding/finalize geometry hash changes are expected; only flag structural loss.
          const structural = diffs.some((d) =>
            d.startsWith("questions:") ||
            d.startsWith("pages:") ||
            d.startsWith("promptCount:") ||
            d.startsWith("duplicateIds") ||
            d.includes("writingLines:"),
          );
          if (structural) {
            this.firstCorruptionStage = `${prev.stage}→${stage}`;
            this.log(`STEP6 FIRST STRUCTURAL DIFF at ${this.firstCorruptionStage}: ${diffs.join("; ")}`);
          } else {
            this.log(`STEP6 non-structural change ${prev.stage}→${stage}: ${diffs.join("; ")}`);
          }
        }
      }
    }
    this.stages.push(snap);
    this.log(`STEP capture ${stage} q=${fingerprint?.questions ?? 0} pages=${fingerprint?.pages ?? 0} geom=${fingerprint?.geometryHash ?? "-"}`);
    return snap;
  }

  recordDraftRestore(meta: {
    restored: boolean;
    draftId?: string;
    schemaVersion?: number;
    layoutVersion?: number;
    generatorVersion?: string;
    createdAt?: string;
    before?: WorksheetDocument | null;
    after?: WorksheetDocument | null;
  }) {
    this.draftRestored = meta.restored;
    this.draftMeta = meta.restored
      ? {
          draftId: meta.draftId,
          schemaVersion: meta.schemaVersion,
          layoutVersion: meta.layoutVersion,
          generatorVersion: meta.generatorVersion,
          createdAt: meta.createdAt,
        }
      : null;
    this.log(`STEP4 draft restored=${meta.restored ? "YES" : "NO"} id=${meta.draftId ?? "-"}`);
    if (meta.restored && meta.before && meta.after) {
      const beforeFp = fingerprintDocument(meta.before);
      const afterFp = fingerprintDocument(meta.after);
      const diffs = diffFingerprints(beforeFp, afterFp);
      if (diffs.length) {
        this.mutationDetected = true;
        this.firstCorruptionStage = this.firstCorruptionStage ?? "draft_restore";
        this.log(`STEP4 DRAFT RESTORE MUTATION — STOP: ${diffs.join("; ")}`);
      }
    }
    if (meta.restored && meta.after) {
      this.captureStage("after_draft_restore", meta.after, "draft restore");
    }
  }

  /** STEP 9 — pre-render assertions. */
  assertBeforeRender(doc: WorksheetDocument): void {
    const fp = fingerprintDocument(doc);
    const tree = buildLayoutTree(doc);
    const layoutDump = dumpLayoutTreeCounts(tree);
    const errors: string[] = [];
    if (fp.questions <= 0) errors.push("document.questions.length == 0");
    if (fp.pages <= 0) errors.push("document.pages.length == 0");
    if (layoutDump.pages <= 0) errors.push("layoutTree.pages.length == 0");
    if (fp.duplicateIds.length) errors.push(`duplicate ids: ${fp.duplicateIds.join(",")}`);
    for (const page of doc.pages) {
      for (const el of page.elements) {
        if (![el.x, el.y, el.width, el.height].every(Number.isFinite)) {
          errors.push(`NaN geometry ${el.id}`);
        }
      }
    }
    const integrity = auditDocumentToLayoutTree(doc);
    for (const issue of integrity.issues) {
      if (["QUESTION_MISSING_IN_TREE", "PROMPT_CHILD_MISSING", "NAN_GEOMETRY", "COUNT_MISMATCH"].includes(issue.code)) {
        errors.push(`${issue.code}: ${issue.message}`);
      }
    }
    this.captureStage("pre_render_assert", doc, errors.length ? errors.join("; ") : "ok");
    this.captureStage("layout_tree", doc, `geometryHash=${layoutDump.geometryHash}`);
    if (errors.length) {
      this.firstCorruptionStage = this.firstCorruptionStage ?? "pre_render_assert";
      const msg = `${LOG} STEP9 ASSERT FAIL — STOP: ${errors.join("; ")}`;
      console.error(msg);
      throw new Error(msg);
    }
  }

  /** STEP 6 — downloadable JSON blob (browser). */
  toDownloadableJson(): string {
    return JSON.stringify(
      {
        rawApi: this.rawApi,
        stages: this.stages,
        diffs: this.diffs,
        draftRestored: this.draftRestored,
        draftMeta: this.draftMeta,
        mutationDetected: this.mutationDetected,
        firstCorruptionStage: this.firstCorruptionStage,
        logs: this.logs,
        report: this.buildReport(),
      },
      null,
      2,
    );
  }

  /** Hydrate from API `pipelineAudit` so client can continue stage chain. */
  ingestServerAudit(payload: {
    rawApi?: unknown;
    stages?: unknown[];
    diffs?: unknown[];
    firstCorruptionStage?: string | null;
    mutationDetected?: boolean;
    logs?: string[];
  }) {
    if (payload.rawApi && typeof payload.rawApi === "object") {
      this.rawApi = payload.rawApi as RawApiSnapshot;
    }
    if (Array.isArray(payload.stages)) {
      this.stages = payload.stages as StageSnapshot[];
    }
    if (Array.isArray(payload.diffs)) {
      this.diffs = payload.diffs as StageDiff[];
    }
    if (payload.firstCorruptionStage) {
      this.firstCorruptionStage = payload.firstCorruptionStage;
    }
    if (payload.mutationDetected) this.mutationDetected = true;
    if (Array.isArray(payload.logs)) {
      this.logs.push(...payload.logs);
    }
    this.log("ingested server pipelineAudit");
  }

  downloadInBrowser(filename = `worksheet-pipeline-audit-${Date.now()}.json`) {
    const g = globalThis as {
      document?: {
        createElement: (tag: string) => {
          href: string;
          download: string;
          click: () => void;
        };
      };
      URL?: { createObjectURL: (b: Blob) => string; revokeObjectURL: (u: string) => void };
      Blob?: typeof Blob;
    };
    if (!g.document || !g.URL || !g.Blob) return;
    const blob = new g.Blob([this.toDownloadableJson()], { type: "application/json" });
    const url = g.URL.createObjectURL(blob);
    const a = g.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    g.URL.revokeObjectURL(url);
  }

  buildReport(): LivePipelineReport {
    const staticDoc = buildStaticIntegrityWorksheet();
    const staticAudit = auditDocumentToLayoutTree(staticDoc);
    const staticPath = staticAudit.ok || staticAudit.issues.every((i) => i.code === "ILLUSTRATION_LABEL_DROPPED")
      ? "PASS"
      : "FAIL";

    const aiStages = this.stages.filter((s) =>
      s.stage === "parsed_document" || s.stage === "client_received" || s.stage === "after_finalize",
    );
    const aiPath: LivePipelineReport["aiPath"] = aiStages.length === 0
      ? "UNKNOWN"
      : this.firstCorruptionStage && this.firstCorruptionStage.includes("parsed")
        ? "FAIL"
        : this.stages.some((s) => s.fingerprint && s.fingerprint.questions > 0)
          ? "PASS"
          : "FAIL";

    const draftRestore: LivePipelineReport["draftRestore"] = !this.draftRestored
      ? "N/A"
      : this.firstCorruptionStage === "draft_restore"
        ? "FAIL"
        : "PASS";

    return {
      staticPath,
      aiPath,
      draftRestore,
      mutationDetected: this.mutationDetected,
      firstCorruptionStage: this.firstCorruptionStage,
      stages: this.stages,
      diffs: this.diffs,
      rawApi: this.rawApi,
      logs: this.logs,
    };
  }

  printFinalReport() {
    const report = this.buildReport();
    console.groupCollapsed(`${LOG} STEP10 FINAL REPORT`);
    console.log({
      StaticPath: report.staticPath,
      AIPath: report.aiPath,
      DraftRestore: report.draftRestore,
      MutationDetected: report.mutationDetected ? "YES" : "NO",
      FirstCorruptionStage: report.firstCorruptionStage ?? "none",
    });
    console.table(report.diffs.filter((d) => d.changed));
    console.groupEnd();
    return report;
  }
}

/** Global session for the current browser generate flow. */
let activeSession: LivePipelineSession | null = null;

export function beginLivePipelineSession(): LivePipelineSession {
  activeSession = new LivePipelineSession();
  activeSession.log("session started");
  return activeSession;
}

export function resumeLivePipelineSessionFromServer(payload: {
  rawApi?: unknown;
  stages?: unknown[];
  diffs?: unknown[];
  firstCorruptionStage?: string | null;
  mutationDetected?: boolean;
  logs?: string[];
}): LivePipelineSession {
  const session = beginLivePipelineSession();
  session.ingestServerAudit(payload);
  return session;
}

export function getLivePipelineSession(): LivePipelineSession | null {
  return activeSession;
}

export function endLivePipelineSession(): LivePipelineReport | null {
  if (!activeSession) return null;
  const report = activeSession.printFinalReport();
  activeSession = null;
  return report;
}

/** STEP 7 — legacy draft schema gate. */
export type DraftOpenDecision = "open_readonly" | "upgrade_copy" | "discard" | "open";

export function evaluateDraftSchema(draft: {
  schemaVersion?: number;
  layoutVersion?: number;
  document: WorksheetDocument;
}): { compatible: boolean; decision: DraftOpenDecision; message: string } {
  const schemaVersion = draft.schemaVersion ?? 0;
  const layoutVersion = draft.layoutVersion ?? 0;
  if (schemaVersion === WORKSHEET_SCHEMA_VERSION && layoutVersion === WORKSHEET_LAYOUT_VERSION) {
    return { compatible: true, decision: "open", message: "Draft schema current" };
  }
  if (schemaVersion === 0 && layoutVersion === 0) {
    // Legacy drafts without version metadata — do not silent-migrate.
    return {
      compatible: false,
      decision: "upgrade_copy",
      message: "Legacy draft without schemaVersion — choose Open Read Only, Upgrade Copy, or Discard",
    };
  }
  return {
    compatible: false,
    decision: "upgrade_copy",
    message: `Draft schema ${schemaVersion}/${layoutVersion} != current ${WORKSHEET_SCHEMA_VERSION}/${WORKSHEET_LAYOUT_VERSION}`,
  };
}

/** STEP 8 — clean session flag (disable restore). */
export function isCleanSessionEnabled(): boolean {
  const loc = (globalThis as { location?: { search?: string } }).location;
  if (!loc?.search) return false;
  return new URLSearchParams(loc.search).has("cleanSession");
}

export function shouldSkipDraftRestore(): boolean {
  return isCleanSessionEnabled();
}
