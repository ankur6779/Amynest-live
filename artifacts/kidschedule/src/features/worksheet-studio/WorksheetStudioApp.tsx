import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAppNavigate } from "@/components/app-link";
import { toast } from "sonner";
import type { WorksheetDocument, WorksheetGenerateRequest, WorksheetLanguage } from "@workspace/worksheet-studio";
import {
  applyLanguageToDocument,
  CURRICULUM_TOPICS,
  generateAnswerKeyDocument,
  markTopicCompleted,
  scoreWorksheet,
} from "@workspace/worksheet-studio";
import { exportBulkPdfs, loadLatestDraft, saveToLibrary, applyBrandingToDocument } from "@workspace/worksheet-studio/client";
import { WorksheetHome } from "./WorksheetHome";
import { WorksheetGeneratingOverlay } from "./WorksheetGeneratingOverlay";
import { WorksheetOnboarding, shouldShowOnboarding } from "./WorksheetOnboarding";
import { WorksheetErrorBoundary } from "./WorksheetErrorBoundary";
import { WorksheetLibrarySheet } from "./WorksheetLibrarySheet";
import { WorksheetProductivityHub } from "./WorksheetProductivityHub";
import { WorksheetBrandingSheet } from "./WorksheetBrandingSheet";
import { useWorksheetAi } from "./use-worksheet-ai";
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

export function WorksheetStudioApp() {
  const authFetch = useAuthFetch();
  const { back } = useAppNavigate();
  const { generate, improve, loading, improving } = useWorksheetAi(authFetch);
  const { run: runCopilot } = useWorksheetCopilot(authFetch);
  const [view, setView] = useState<View>({ kind: "home" });
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const [hasDraft, setHasDraft] = useState(false);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [productivityOpen, setProductivityOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [brandingVersion, setBrandingVersion] = useState(0);
  const requestBuilderRef = useRef<(() => WorksheetGenerateRequest) | null>(null);
  const languageRef = useRef<WorksheetLanguage>("english");

  const document = view.kind === "editor" ? view.document : null;

  useEffect(() => {
    void loadLatestDraft().then((d) => setHasDraft(!!d));
    void flushOfflineQueue(authFetch).then((n) => {
      if (n > 0) toast.success(`Synced ${n} offline request${n > 1 ? "s" : ""}`);
    });
  }, [authFetch]);

  const handleRestore = useCallback((doc: WorksheetDocument) => {
    setView({ kind: "editor", document: doc });
    toast.info("Draft restored", { description: "Your worksheet was recovered automatically." });
  }, []);

  const { saveNow, saveState, savedAt } = useWorksheetAutosave(document, handleRestore);

  usePageBackHandler(() => {
    if (libraryOpen) { setLibraryOpen(false); return true; }
    if (productivityOpen) { setProductivityOpen(false); return true; }
    if (brandingOpen) { setBrandingOpen(false); return true; }
    if (view.kind === "editor") {
      setView({ kind: "home" });
      return true;
    }
    back();
    return true;
  }, [view.kind, back, libraryOpen, productivityOpen, brandingOpen]);

  const openBranding = useCallback(() => {
    trackWorksheetEvent("worksheet_branding_open");
    setBrandingOpen(true);
  }, []);

  const openDocument = useCallback(async (doc: WorksheetDocument) => {
    const branded = applyBrandingToDocument(doc);
    setView({ kind: "editor", document: branded });
    try {
      await saveNow(branded);
    } catch {
      toast.error("Could not save draft locally", { description: "Your worksheet is open — edits still work in this session." });
    }
  }, [saveNow]);

  const handleDocumentChange = useCallback((doc: WorksheetDocument) => {
    setView((v) => (v.kind === "editor" ? { kind: "editor", document: doc } : v));
  }, []);

  const handleGenerate = async (req: WorksheetGenerateRequest) => {
    trackWorksheetEvent("worksheet_generate_start", { subject: req.subject });
    try {
      const result = await generate(req);
      let doc = result.document;
      if (languageRef.current !== "english") {
        doc = applyLanguageToDocument(doc, languageRef.current);
      }
      doc = applyBrandingToDocument(doc);
      const quality = result.qualityScore ?? scoreWorksheet(doc).overall;
      setView({ kind: "editor", document: doc });
      void hapticWorksheetSuccess();
      const sourceLabel = result.usedFallback
        ? "Offline template (saved locally)"
        : result.source === "ai"
          ? "AI-generated"
          : "Template";
      toast.success("Worksheet ready!", {
        description: `${sourceLabel} · Quality ${quality}/100`,
      });
      try {
        await saveNow(doc);
      } catch {
        toast.error("Could not save draft", { description: "Export still works for this session." });
      }
      void saveToLibrary(doc).catch(() => {});
      trackCurriculumCompletion(doc);
      trackWorksheetEvent("worksheet_generate_done", { source: result.source });
    } catch {
      toast.error("Generation failed", { description: "Please try again — your settings are saved." });
    }
  };

  const handleOpenPack = useCallback(async (docs: WorksheetDocument[], label: string) => {
    trackWorksheetEvent("worksheet_pack_generate", { count: docs.length, label });
    const localized = languageRef.current === "english"
      ? docs
      : docs.map((d) => applyLanguageToDocument(d, languageRef.current));
    const branded = localized.map((d) => applyBrandingToDocument(d));
    for (const doc of branded) {
      void saveToLibrary(doc, { collection: label }).catch(() => {});
      trackCurriculumCompletion(doc);
    }
    if (branded[0]) {
      setView({ kind: "editor", document: branded[0] });
      try {
        await saveNow(branded[0]);
      } catch { /* session-only */ }
      void hapticWorksheetSuccess();
      toast.success(`${label} ready`, {
        description: `${branded.length} worksheets saved to your library.`,
      });
    }
  }, [saveNow]);

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
      if (action === "answer_key") {
        const key = generateAnswerKeyDocument(view.document);
        setView({ kind: "editor", document: key });
        await saveNow(key);
        toast.success("Answer key generated");
        return key;
      }
      const next = await improve(view.document, action);
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
    try {
      const draft = await loadLatestDraft();
      if (draft?.document) handleRestore(draft.document);
      else toast.info("No draft found");
    } catch {
      toast.error("Could not restore draft");
    }
  };

  const buildRequest = () => requestBuilderRef.current?.() ?? {
    prompt: "UKG fun learning worksheet",
    classLevel: "ukg" as const,
    subject: "english" as const,
    difficulty: "easy" as const,
    pageCount: 1,
  };

  const busyOverlay = loading || improving !== null;

  return (
    <WorksheetErrorBoundary onReset={() => setView({ kind: "home" })}>
      {showOnboarding && <WorksheetOnboarding onComplete={() => setShowOnboarding(false)} />}
      {busyOverlay && (
        <WorksheetGeneratingOverlay
          message={improving ? "Updating your worksheet…" : "Creating your worksheet…"}
        />
      )}

      <WorksheetLibrarySheet
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onOpenDocument={(doc) => void openDocument(doc)}
        onBulkExport={(entries) => void handleBulkExport(entries)}
        onOpenBranding={() => { setLibraryOpen(false); openBranding(); }}
      />

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

      <WorksheetProductivityHub
        key={brandingVersion}
        open={productivityOpen}
        onOpenChange={setProductivityOpen}
        buildRequest={buildRequest}
        onOpenDocument={(doc) => void openDocument(doc)}
        onOpenPack={(docs, label) => void handleOpenPack(docs, label)}
        loading={loading}
      />

      {view.kind === "editor" ? (
        <Suspense fallback={<EditorFallback />}>
          <WorksheetEditor
            document={view.document}
            onBack={() => setView({ kind: "home" })}
            onImprove={handleImprove}
            onCopilotMessage={handleCopilot}
            improving={improving}
            copilotBusy={copilotBusy}
            saveState={saveState}
            savedAt={savedAt}
            onDocumentChange={handleDocumentChange}
            onRestoreVersion={(doc) => {
              setView({ kind: "editor", document: doc });
              toast.success("Version restored");
            }}
          />
        </Suspense>
      ) : (
        <WorksheetHome
          loading={loading}
          hasDraft={hasDraft}
          onOpenDrafts={() => void resumeDraft()}
          onOpenLibrary={() => { trackWorksheetEvent("worksheet_library_open"); setLibraryOpen(true); }}
          onOpenProductivity={() => { trackWorksheetEvent("worksheet_productivity_open"); setProductivityOpen(true); }}
          onOpenBranding={openBranding}
          onRegisterBuilder={(fn) => { requestBuilderRef.current = fn; }}
          onRegisterLanguage={(lang) => { languageRef.current = lang; }}
          onGenerate={(req) => void handleGenerate(req)}
        />
      )}
    </WorksheetErrorBoundary>
  );
}
