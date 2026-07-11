import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAppNavigate } from "@/components/app-link";
import { toast } from "sonner";
import type { WorksheetDocument, WorksheetGenerateRequest, WorksheetLanguage, WorksheetReconstructRequest } from "@workspace/worksheet-studio";
import {
  applyLanguageToDocument,
  CURRICULUM_TOPICS,
  generateAnswerKeyDocument,
  generateWorksheetLocal,
  markTopicCompleted,
  reconstructWorksheetLocal,
  scoreWorksheet,
  summarizeDocumentChanges,
  type DocumentChangeSummary,
  type PostGenerationRecommendation,
  getLivePipelineSession,
  endLivePipelineSession,
  beginLivePipelineSession,
  evaluateDraftSchema,
  shouldSkipDraftRestore,
  WORKSHEET_SCHEMA_VERSION,
  WORKSHEET_LAYOUT_VERSION,
  WORKSHEET_GENERATOR_VERSION,
} from "@workspace/worksheet-studio";
import { exportBulkPdfs, loadLatestDraft, saveToLibrary, applyBrandingToDocument, deleteDraft } from "@workspace/worksheet-studio/client";
import { getEditorSyncAudit, requestEditorDocumentRepaint } from "./editor-state-sync-audit";
import { setWorksheetDebugOrigin } from "./WorksheetDebugPanel";
import { WorksheetHome } from "./WorksheetHome";
import { WorksheetGeneratingOverlay } from "./WorksheetGeneratingOverlay";
import { WorksheetOnboarding, shouldShowOnboarding } from "./WorksheetOnboarding";
import { WorksheetErrorBoundary } from "./WorksheetErrorBoundary";
import { WorksheetLibrarySheet } from "./WorksheetLibrarySheet";
import { WorksheetProductivityHub } from "./WorksheetProductivityHub";
import { WorksheetBrandingSheet } from "./WorksheetBrandingSheet";
import { CopilotChangePreview } from "./CopilotChangePreview";
import { PostGenerationSheet } from "./PostGenerationSheet";
import { useWorksheetAi } from "./use-worksheet-ai";
import { useWorksheetReconstruction } from "./use-worksheet-reconstruction";
import { ReconstructionProgressOverlay } from "./ReconstructionProgressOverlay";
import { useWorksheetAutosave } from "./use-worksheet-autosave";
import { useWorksheetCopilot, copilotToAction, copilotToGeneratePatch } from "./use-worksheet-copilot";
import { hapticWorksheetSuccess } from "./worksheet-haptics";
import { trackWorksheetEvent, flushOfflineQueue } from "./worksheet-studio-analytics";
import type { LibraryEntry } from "@workspace/worksheet-studio/client";
import { Loader2 } from "lucide-react";

const WorksheetEditor = lazy(() =>
  import("./WorksheetEditor").then((m) => ({ default: m.WorksheetEditor })),
);

type View = { kind: "home" } | { kind: "editor"; document: WorksheetDocument };

function trackCurriculumCompletion(doc: WorksheetDocument): void {
  const topicLower = `${doc.meta.topic} ${doc.prompt}`.toLowerCase();
  for (const t of CURRICULUM_TOPICS) {
    if (topicLower.includes(t.id) || topicLower.includes(t.label.toLowerCase())) {
      markTopicCompleted(t.id, doc.meta.classLevel);
      return;
    }
  }
}

function EditorFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" aria-hidden />
      <span className="sr-only">Loading editor</span>
    </div>
  );
}

export type WorksheetStudioAppProps = {
  embedded?: boolean;
  onViewChange?: (inEditor: boolean) => void;
  onRegisterOpenPack?: (fn: (docs: WorksheetDocument[], label: string) => void) => void;
  /** v8.1 — trigger satisfaction prompt after generate/export */
  onWorksheetReady?: (context: string) => void;
};

export function WorksheetStudioApp({ embedded, onViewChange, onRegisterOpenPack, onWorksheetReady }: WorksheetStudioAppProps = {}) {
  const authFetch = useAuthFetch();
  const { back } = useAppNavigate();
  const { generate, improve, loading, improving } = useWorksheetAi(authFetch);
  const { reconstruct, loading: reconstructing, stage: reconstructStage } = useWorksheetReconstruction(authFetch);
  const { run: runCopilot } = useWorksheetCopilot(authFetch);
  const [view, setView] = useState<View>({ kind: "home" });
  const [showOnboarding, setShowOnboarding] = useState(() => !embedded && shouldShowOnboarding);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastWorksheetTitle, setLastWorksheetTitle] = useState<string | null>(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [productivityOpen, setProductivityOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [brandingVersion, setBrandingVersion] = useState(0);
  const [postGenOpen, setPostGenOpen] = useState(false);
  const [postGenDoc, setPostGenDoc] = useState<WorksheetDocument | null>(null);
  const [editPreviewOpen, setEditPreviewOpen] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{
    document: WorksheetDocument;
    summary: string;
    changeSummary: DocumentChangeSummary;
  } | null>(null);
  const [legacyDraft, setLegacyDraft] = useState<{
    document: WorksheetDocument;
    draftId: string;
    message: string;
    savedAt: string;
  } | null>(null);
  const requestBuilderRef = useRef<(() => WorksheetGenerateRequest) | null>(null);
  const languageRef = useRef<WorksheetLanguage>("english");

  const document = view.kind === "editor" ? view.document : null;

  useEffect(() => {
    if (shouldSkipDraftRestore()) {
      setHasDraft(false);
      console.info("[LivePipelineAudit] STEP8 cleanSession — draft restore disabled");
      void flushOfflineQueue(authFetch).then((n) => {
        if (n > 0) toast.success(`Synced ${n} offline request${n > 1 ? "s" : ""}`);
      });
      return;
    }
    void loadLatestDraft().then((d) => {
      setHasDraft(!!d);
      if (d?.document) {
        setLastWorksheetTitle(d.document.meta.title || d.document.meta.topic);
      }
    });
    void flushOfflineQueue(authFetch).then((n) => {
      if (n > 0) toast.success(`Synced ${n} offline request${n > 1 ? "s" : ""}`);
    });
  }, [authFetch]);

  const { saveNow, saveState, savedAt } = useWorksheetAutosave(document);

  const enterEditor = useCallback(async (
    doc: WorksheetDocument,
    opts?: { persist?: boolean; announce?: string; skipPipelineAssert?: boolean },
  ) => {
    const session = getLivePipelineSession() ?? beginLivePipelineSession();
    let branded = doc;
    try {
      getEditorSyncAudit()?.logOp("branding", "Branding", "applyBrandingToDocument (enterEditor)");
      branded = applyBrandingToDocument(doc);
    } catch {
      toast.error("Could not apply school branding", { description: "Using default layout." });
    }
    session.captureStage("after_branding", branded, "applyBrandingToDocument");
    if (!opts?.skipPipelineAssert) {
      try {
        session.assertBeforeRender(branded);
      } catch (err) {
        toast.error("Pipeline assertion failed", {
          description: err instanceof Error ? err.message : "Document failed pre-render checks",
        });
        throw err;
      }
    }
    if (view.kind === "editor") {
      requestEditorDocumentRepaint("enter_editor_replace");
    }
    setView({ kind: "editor", document: branded });
    onViewChange?.(true);
    setHasDraft(true);
    setLastWorksheetTitle(branded.meta.title || branded.meta.topic);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    if (opts?.announce) {
      toast.success(opts.announce, {
        description: "Tap anywhere on the worksheet to edit text, move items, or export PDF.",
        action: {
          label: "Edit now",
          onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
        },
      });
    }
    if (opts?.persist !== false && !shouldSkipDraftRestore()) {
      try {
        await saveNow(branded);
      } catch {
        toast.error("Could not save draft", { description: "Export still works for this session." });
      }
    }
    return branded;
  }, [onViewChange, saveNow, view.kind]);

  useEffect(() => {
    if (view.kind === "editor" && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [view.kind, view.kind === "editor" ? view.document.id : ""]);

  usePageBackHandler(() => {
    if (libraryOpen) { setLibraryOpen(false); return true; }
    if (productivityOpen) { setProductivityOpen(false); return true; }
    if (brandingOpen) { setBrandingOpen(false); return true; }
    if (view.kind === "editor") {
      setView({ kind: "home" });
      onViewChange?.(false);
      return true;
    }
    if (embedded) return false;
    back();
    return true;
  }, [view.kind, back, libraryOpen, productivityOpen, brandingOpen, embedded, onViewChange]);

  const openBranding = useCallback(() => {
    trackWorksheetEvent("worksheet_branding_open");
    setBrandingOpen(true);
  }, []);

  const openDocument = useCallback(async (doc: WorksheetDocument) => {
    await enterEditor(doc);
  }, [enterEditor]);

  const handleDocumentChange = useCallback((doc: WorksheetDocument) => {
    const audit = getEditorSyncAudit();
    if (audit) {
      try {
        audit.noteDocumentChange(doc);
      } catch (err) {
        console.error(err);
        toast.error("Automatic document change blocked", {
          description: "Editor state mutated after render without teacher action.",
        });
        return;
      }
    }
    setView((v) => (v.kind === "editor" ? { kind: "editor", document: doc } : v));
  }, []);

  const handleGenerate = async (req: WorksheetGenerateRequest) => {
    const promptText = req.enhancedPrompt?.trim() || req.prompt;
    trackWorksheetEvent("worksheet_generate_start", {
      subject: req.subject,
      promptLength: promptText.length,
      classLevel: req.classLevel,
    });
    try {
      const genStart = Date.now();
      const result = await generate(req);
      const genMs = Date.now() - genStart;
      let doc = result.document;
      const blockedBroken =
        !doc?.pages?.length ||
        !doc.pages.some((p) => p.elements.some((e) => e.type === "question_block"));
      if (blockedBroken) {
        doc = generateWorksheetLocal(req);
      }
      if ((req.language ?? languageRef.current) !== "english") {
        doc = applyLanguageToDocument(doc, req.language ?? languageRef.current);
      }
      // Acceptance: never open editor with an invalid document
      if (!doc.pages.length || !doc.pages.some((p) => p.elements.some((e) => e.type === "question_block"))) {
        doc = generateWorksheetLocal(req);
      }
      const usedLocal = Boolean(result.usedFallback || blockedBroken);
      setWorksheetDebugOrigin(usedLocal || result.source !== "ai" ? "local" : "ai");
      const quality = result.qualityScore ?? scoreWorksheet(doc).overall;
      await enterEditor(doc);
      setPostGenDoc(doc);
      setPostGenOpen(true);
      void hapticWorksheetSuccess();
      if (usedLocal) {
        toast.info("AI response invalid. Local worksheet generated.", {
          description:
            result.attemptCount && result.attemptCount > 1
              ? `Schema validation failed after ${result.attemptCount} attempts.`
              : "Broken AI output was blocked before the editor.",
        });
      } else {
        toast.success("Worksheet ready!", {
          description: `AI-generated · Quality ${quality}/100 · Opening editor…`,
        });
      }
      onWorksheetReady?.(`generate:${doc.meta.topic}`);
      void saveToLibrary(doc).catch(() => {});
      trackCurriculumCompletion(doc);
      trackWorksheetEvent("worksheet_generate_done", {
        source: result.source,
        qualityScore: quality,
        topic: doc.meta.topic,
        classLevel: doc.meta.classLevel,
        durationMs: genMs,
        usedFallback: Boolean(result.usedFallback),
      });
      const session = getLivePipelineSession();
      const wantDownload =
        typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).has("pipelineAudit") ||
          new URLSearchParams(window.location.search).has("layoutDebug"));
      if (wantDownload && session) {
        session.downloadInBrowser();
      }
      endLivePipelineSession();
    } catch {
      endLivePipelineSession();
      toast.error("Generation failed", { description: "Please try again — your settings are saved." });
    }
  };

  const handleReconstruct = async (req: WorksheetReconstructRequest) => {
    trackWorksheetEvent("worksheet_reconstruct_start", {
      style: req.style,
      sourceCount: req.sources.length,
    });
    try {
      const result = await reconstruct(req);
      let doc = result.document;
      if (!doc?.pages?.length) {
        doc = reconstructWorksheetLocal(req).document ?? doc;
      }
      if ((req.language ?? languageRef.current) !== "english") {
        doc = applyLanguageToDocument(doc, req.language ?? languageRef.current);
      }
      const quality = result.qualityScore ?? scoreWorksheet(doc).overall;
      await enterEditor(doc);
      setPostGenDoc(doc);
      setPostGenOpen(true);
      void hapticWorksheetSuccess();
      const sourceLabel = result.usedFallback
        ? "Offline reconstruction (editable)"
        : "AI reconstructed";
      toast.success("Worksheet reconstructed!", {
        description: `${sourceLabel} · Quality ${quality}/100`,
      });
      if (result.uncertainAreas.length > 0 && (result.validation?.confidence ?? 100) < 90) {
        toast.info("Review uncertain areas", {
          description: result.uncertainAreas.slice(0, 2).join(" · "),
        });
      }
      void saveToLibrary(doc).catch(() => {});
      trackCurriculumCompletion(doc);
      trackWorksheetEvent("worksheet_reconstruct_done", {
        source: result.source,
        qualityScore: quality,
        style: req.style,
      });
    } catch {
      toast.error("Reconstruction failed", { description: "Try a clearer photo or PDF." });
    }
  };

  const handlePostGenRecommendation = async (rec: PostGenerationRecommendation) => {
    if (view.kind !== "editor") return;
    const doc = view.document;
    if (rec.action === "regenerate_variant") {
      await handleGenerate({
        prompt: `${doc.prompt} — ${rec.label}`,
        classLevel: doc.meta.classLevel,
        subject: doc.meta.subject,
        difficulty: doc.meta.difficulty,
        pageCount: doc.meta.pageCount,
      });
      return;
    }
    await handleImprove(rec.action);
  };

  const applyPendingEdit = async () => {
    if (!pendingEdit || view.kind !== "editor") return;
    requestEditorDocumentRepaint("copilot_apply");
    setView({ kind: "editor", document: pendingEdit.document });
    try {
      await saveNow(pendingEdit.document);
      void saveToLibrary(pendingEdit.document).catch(() => {});
    } catch {
      toast.error("Could not save changes");
    }
    trackWorksheetEvent("worksheet_copilot_edit");
    toast.success("Changes applied", { description: pendingEdit.summary });
    setEditPreviewOpen(false);
    setPendingEdit(null);
  };

  const handleOpenPack = useCallback(async (docs: WorksheetDocument[], label: string) => {
    trackWorksheetEvent("worksheet_pack_generate", { count: docs.length, label });
    const localized = languageRef.current === "english"
      ? docs
      : docs.map((d) => applyLanguageToDocument(d, languageRef.current));
    const branded = localized.map((d) => {
      try {
        return applyBrandingToDocument(d);
      } catch {
        return d;
      }
    });
    for (const doc of branded) {
      void saveToLibrary(doc, { collection: label }).catch(() => {});
      trackCurriculumCompletion(doc);
    }
    if (branded[0]) {
      if (view.kind === "editor") {
        requestEditorDocumentRepaint("open_pack");
      }
      setView({ kind: "editor", document: branded[0] });
      onViewChange?.(true);
      try {
        await saveNow(branded[0]);
      } catch { /* session-only */ }
      void hapticWorksheetSuccess();
      toast.success(`${label} ready`, {
        description: `${branded.length} worksheets saved to your library.`,
      });
    }
  }, [saveNow, onViewChange, view.kind]);

  useEffect(() => {
    onRegisterOpenPack?.(handleOpenPack);
  }, [onRegisterOpenPack, handleOpenPack]);

  const handleBulkExport = useCallback(async (entries: LibraryEntry[]) => {
    trackWorksheetEvent("worksheet_bulk_export", { count: entries.length });
    toast.info(`Exporting ${entries.length} worksheets…`);
    try {
      await exportBulkPdfs(entries.map((e) => e.document));
      toast.success("Export complete");
    } catch {
      toast.error("Export failed");
    }
  }, []);

  const handleImprove = async (action: Parameters<typeof improve>[1]): Promise<WorksheetDocument> => {
    if (view.kind !== "editor") {
      toast.error("No worksheet open");
      throw new Error("No worksheet open");
    }
    try {
      getEditorSyncAudit()?.allowTeacher(`improve:${action}`);
      if (action === "answer_key") {
        const key = generateAnswerKeyDocument(view.document);
        getEditorSyncAudit()?.noteDocumentChange(key);
        setView({ kind: "editor", document: key });
        await saveNow(key);
        toast.success("Answer key generated");
        return key;
      }
      const next = await improve(view.document, action);
      getEditorSyncAudit()?.noteDocumentChange(next);
      setView({ kind: "editor", document: next });
      await saveNow(next);
      void saveToLibrary(next).catch(() => {});
      toast.success("Applied");
      return next;
    } catch {
      toast.error("Could not apply change", { description: "Please try again." });
      return view.document;
    }
  };

  const handleCopilot = async (message: string) => {
    if (view.kind !== "editor") return;
    setCopilotBusy(true);
    trackWorksheetEvent("worksheet_copilot");
    try {
      const result = await runCopilot(message, view.document);
      if (result.kind === "message") {
        toast.message(result.text);
        return;
      }
      if (result.kind === "edit") {
        const changeSummary = summarizeDocumentChanges(view.document, result.document);
        setPendingEdit({
          document: result.document,
          summary: result.summary,
          changeSummary,
        });
        setEditPreviewOpen(true);
        return;
      }
      const action = copilotToAction(result);
      if (action) {
        await handleImprove(action);
        return;
      }
      const patch = copilotToGeneratePatch(result, view.document);
      if (patch) {
        await handleGenerate(patch);
      }
    } catch {
      toast.error("Copilot unavailable", { description: "Try a quick action instead." });
    } finally {
      setCopilotBusy(false);
    }
  };

  const resumeDraft = async () => {
    if (shouldSkipDraftRestore()) {
      toast.info("Clean session", { description: "Draft restore is disabled (?cleanSession=1)." });
      return;
    }
    try {
      const draft = await loadLatestDraft();
      if (!draft?.document) {
        toast.info("No worksheet found", { description: "Generate a new worksheet or check Library." });
        return;
      }
      const gate = evaluateDraftSchema({
        schemaVersion: draft.schemaVersion,
        layoutVersion: draft.layoutVersion,
        document: draft.document,
      });
      if (!gate.compatible) {
        setLegacyDraft({
          document: draft.document,
          draftId: draft.id,
          message: gate.message,
          savedAt: draft.savedAt,
        });
        return;
      }
      const session = beginLivePipelineSession();
      session.recordDraftRestore({
        restored: true,
        draftId: draft.id,
        schemaVersion: draft.schemaVersion ?? WORKSHEET_SCHEMA_VERSION,
        layoutVersion: draft.layoutVersion ?? WORKSHEET_LAYOUT_VERSION,
        generatorVersion: draft.generatorVersion ?? WORKSHEET_GENERATOR_VERSION,
        createdAt: draft.savedAt,
        before: draft.document,
        after: draft.document,
      });
      await enterEditor(draft.document, { persist: false });
      endLivePipelineSession();
      toast.info("Worksheet opened", { description: "Edit text, move items, or tap Export for PDF." });
    } catch {
      toast.error("Could not open worksheet");
    }
  };

  const buildRequest = () => requestBuilderRef.current?.() ?? {
    prompt: "UKG fun learning worksheet",
    classLevel: "ukg" as const,
    subject: "english" as const,
    difficulty: "easy" as const,
    pageCount: 1,
  };

  const busyOverlay = loading || improving !== null || reconstructing;

  return (
    <WorksheetErrorBoundary onReset={() => setView({ kind: "home" })}>
      <div className="ws-app-shell min-h-dvh w-full min-w-0 max-w-[100vw] overflow-x-hidden">
      {showOnboarding && <WorksheetOnboarding onComplete={() => setShowOnboarding(false)} />}
      {busyOverlay && reconstructStage ? (
        <ReconstructionProgressOverlay stage={reconstructStage} />
      ) : busyOverlay ? (
        <WorksheetGeneratingOverlay
          message={improving ? "Updating your worksheet…" : reconstructing ? "Reconstructing worksheet…" : "Creating your worksheet…"}
        />
      ) : null}

      {libraryOpen ? (
        <WorksheetLibrarySheet
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          onOpenDocument={(doc) => void openDocument(doc)}
          onBulkExport={(entries) => void handleBulkExport(entries)}
          onOpenBranding={() => { setLibraryOpen(false); openBranding(); }}
        />
      ) : null}

      {brandingOpen ? (
        <WorksheetBrandingSheet
          open={brandingOpen}
          onOpenChange={setBrandingOpen}
          onBrandingSaved={() => {
            setBrandingVersion((v) => v + 1);
            if (view.kind === "editor") {
              void openDocument(view.document);
            }
          }}
        />
      ) : null}

      {productivityOpen ? (
        <WorksheetProductivityHub
          key={brandingVersion}
          open={productivityOpen}
          onOpenChange={setProductivityOpen}
          buildRequest={buildRequest}
          onOpenDocument={(doc) => void openDocument(doc)}
          onOpenPack={(docs, label) => void handleOpenPack(docs, label)}
          loading={loading}
        />
      ) : null}

      <PostGenerationSheet
        open={postGenOpen}
        onOpenChange={setPostGenOpen}
        document={postGenDoc}
        onRecommendation={(rec) => void handlePostGenRecommendation(rec)}
        onEditNow={() => {
          setPostGenOpen(false);
          if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <CopilotChangePreview
        open={editPreviewOpen}
        onOpenChange={(open) => {
          setEditPreviewOpen(open);
          if (!open) setPendingEdit(null);
        }}
        summary={pendingEdit?.changeSummary ?? null}
        editSummary={pendingEdit?.summary ?? ""}
        onAccept={() => void applyPendingEdit()}
        onReject={() => {
          setEditPreviewOpen(false);
          setPendingEdit(null);
          toast.message("Changes discarded");
        }}
      />

      {view.kind === "editor" ? (
        <Suspense fallback={<EditorFallback />}>
          <WorksheetEditor
            document={view.document}
            onBack={() => {
              setView({ kind: "home" });
              onViewChange?.(false);
            }}
            onImprove={handleImprove}
            onCopilotMessage={handleCopilot}
            improving={improving}
            copilotBusy={copilotBusy}
            saveState={saveState}
            savedAt={savedAt}
            onDocumentChange={handleDocumentChange}
            onRestoreVersion={(doc) => {
              const audit = getEditorSyncAudit();
              audit?.allowTeacher("history_restore");
              audit?.logOp("draft_restore", "DraftRestore", "version_restore", { id: doc.id });
              const before = view.kind === "editor" ? view.document : doc;
              beginLivePipelineSession().recordDraftRestore({
                restored: true,
                draftId: doc.id,
                schemaVersion: WORKSHEET_SCHEMA_VERSION,
                layoutVersion: WORKSHEET_LAYOUT_VERSION,
                generatorVersion: WORKSHEET_GENERATOR_VERSION,
                createdAt: new Date().toISOString(),
                before,
                after: doc,
              });
              if (getLivePipelineSession()?.firstCorruptionStage === "draft_restore") {
                toast.error("Draft restore mutated document", {
                  description: "Open aborted — see console [LivePipelineAudit].",
                });
                endLivePipelineSession();
                return;
              }
              try {
                audit?.noteDocumentChange(doc);
              } catch {
                toast.error("Automatic document change blocked");
                endLivePipelineSession();
                return;
              }
              setView({ kind: "editor", document: doc });
              endLivePipelineSession();
              toast.success("Version restored");
            }}
          />
        </Suspense>
      ) : (
        <WorksheetHome
          loading={loading || reconstructing}
          hasDraft={hasDraft && !shouldSkipDraftRestore()}
          lastWorksheetTitle={lastWorksheetTitle}
          onOpenDrafts={() => void resumeDraft()}
          onOpenLibrary={() => { trackWorksheetEvent("worksheet_library_open"); setLibraryOpen(true); }}
          onOpenProductivity={() => { trackWorksheetEvent("worksheet_productivity_open"); setProductivityOpen(true); }}
          onOpenBranding={openBranding}
          onRegisterBuilder={(fn) => { requestBuilderRef.current = fn; }}
          onRegisterLanguage={(lang) => { languageRef.current = lang; }}
          onGenerate={(req) => void handleGenerate(req)}
          onReconstruct={(req) => void handleReconstruct(req)}
        />
      )}
      {legacyDraft ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legacy-draft-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="legacy-draft-title" className="text-lg font-semibold text-[#1e3a5f]">
              Legacy draft detected
            </h2>
            <p className="mt-2 text-sm text-slate-600">{legacyDraft.message}</p>
            <p className="mt-1 text-xs text-slate-400">Saved {legacyDraft.savedAt}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white"
                onClick={async () => {
                  const d = legacyDraft;
                  setLegacyDraft(null);
                  await enterEditor(d.document, { persist: false, skipPipelineAssert: true });
                  toast.info("Opened read-only", { description: "Legacy schema — edits will not auto-upgrade." });
                }}
              >
                Open Read Only
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-[#1e3a5f]"
                onClick={async () => {
                  const d = legacyDraft;
                  setLegacyDraft(null);
                  const upgraded = {
                    ...structuredClone(d.document),
                    id: `ws_${Date.now()}`,
                    version: (d.document.version ?? 1) + 1,
                  };
                  await enterEditor(upgraded, { persist: true });
                  toast.success("Upgrade copy created");
                }}
              >
                Upgrade Copy
              </button>
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-red-600"
                onClick={async () => {
                  try {
                    await deleteDraft(legacyDraft.draftId);
                    setHasDraft(false);
                    setLegacyDraft(null);
                    toast.message("Draft discarded");
                  } catch {
                    toast.error("Could not discard draft");
                  }
                }}
              >
                Discard Draft
              </button>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm text-slate-500"
                onClick={() => setLegacyDraft(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </WorksheetErrorBoundary>
  );
}
