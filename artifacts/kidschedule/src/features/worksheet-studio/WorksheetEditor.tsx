import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Grid3x3, Loader2, Maximize2, Ruler } from "lucide-react";
import type { WorksheetDocument, WorksheetDraftVersion, WorksheetImproveAction } from "@workspace/worksheet-studio";
import type { PrintMode } from "@workspace/worksheet-studio";
import { generateAnswerKeyDocument } from "@workspace/worksheet-studio";
import { toast } from "sonner";
import {
  listVersions,
  exportAndDownloadBestPdf,
  exportWorksheetDocx,
  exportCanvasPng,
  exportCanvasJpeg,
  shareWorksheetFile,
  prepareWorksheetForExport,
  applyPrintMode,
} from "@workspace/worksheet-studio/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createWorksheetCanvas, EXPORT_SCALE_MULTIPLIER, type WorksheetCanvasHandle } from "./fabric-editor";
import { WorksheetAiAssistant } from "./WorksheetAiAssistant";
import { WorksheetToolbar } from "./WorksheetToolbar";
import { WorksheetExportSheet } from "./WorksheetExportSheet";
import { WorksheetAutosaveIndicator } from "./WorksheetAutosaveIndicator";
import { WorksheetDraftHistorySheet } from "./WorksheetDraftHistorySheet";
import { WorksheetImagePicker } from "./WorksheetImagePicker";
import { useWorksheetGestures } from "./use-worksheet-gestures";
import { prepareLayoutForRender } from "@workspace/worksheet-studio";
import { WS_EDITOR_HEADER, WS_PAGE, WS_PAPER_SHADOW, WS_EDITOR_CANVAS, WS_EDITOR_VIEWPORT, WS_OVERLAY, WS_CONTEXT_MENU, WS_MUTED_TEXT, WS_OUTLINE_BTN } from "./worksheet-studio-theme";
import { hapticWorksheetTap } from "./worksheet-haptics";
import { trackWorksheetEvent } from "./worksheet-studio-analytics";
import { WorksheetPropertyPanel } from "./WorksheetPropertyPanel";
import { WorksheetLayoutDebugOverlay } from "./WorksheetLayoutDebugOverlay";

type Props = {
  document: WorksheetDocument;
  onBack: () => void;
  onImprove: (action: WorksheetImproveAction) => Promise<WorksheetDocument>;
  onCopilotMessage: (message: string) => Promise<void>;
  improving: WorksheetImproveAction | null;
  copilotBusy: boolean;
  saveState: "idle" | "saving" | "saved" | "offline";
  savedAt: string | null;
  onRestoreVersion: (doc: WorksheetDocument) => void;
  onDocumentChange?: (doc: WorksheetDocument) => void;
};

export function WorksheetEditor({
  document, onBack, onImprove, onCopilotMessage, improving, copilotBusy, saveState, savedAt, onRestoreVersion, onDocumentChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WorksheetCanvasHandle | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<WorksheetDraftVersion[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pageFlip, setPageFlip] = useState(false);
  const [canvasHandle, setCanvasHandle] = useState<WorksheetCanvasHandle | null>(null);
  const [gridOn, setGridOn] = useState(false);
  const [safeAreaOn, setSafeAreaOn] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>("colour");
  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [layoutDebugOn, setLayoutDebugOn] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("layoutDebug"),
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const syncTimerRef = useRef<number | null>(null);
  const pinchRafRef = useRef<number | null>(null);
  const pinchFactorRef = useRef(1);
  const documentRef = useRef(document);
  const pageIndexRef = useRef(pageIndex);
  documentRef.current = document;
  pageIndexRef.current = pageIndex;

  const page = document.pages[pageIndex];
  const colorMode = document.meta.colorMode;
  const layoutTree = useMemo(() => prepareLayoutForRender(document).layoutTree, [document]);

  const measureCanvasWidth = useCallback(() => {
    const container = canvasContainerRef.current;
    const measured = container?.clientWidth ?? 0;
    if (measured >= 200) return measured;
    return Math.min(window.innerWidth, 480);
  }, []);

  const getLayoutPage = useCallback((pageIdx: number) => {
    const { layoutTree } = prepareLayoutForRender(documentRef.current);
    return layoutTree.pages[pageIdx];
  }, []);

  const initCanvas = useCallback(async () => {
    if (!canvasRef.current) return;
    setCanvasError(false);
    setCanvasReady(false);
    try {
      handleRef.current?.dispose();
      let width = measureCanvasWidth();
      if (width < 200) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        width = measureCanvasWidth();
      }
      const handle = await createWorksheetCanvas(canvasRef.current, width);
      handleRef.current = handle;
      setCanvasHandle(handle);
      const pg = documentRef.current.pages[pageIndexRef.current];
      if (pg) {
        await handle.renderPage(
          pg,
          documentRef.current.meta.colorMode,
          documentRef.current.meta.classLevel,
          getLayoutPage(pageIndexRef.current),
        );
        handle.resetViewport();
      }
      setCanvasReady(true);
    } catch {
      setCanvasError(true);
      toast.error("Editor failed to load", { description: "Please go back and reopen the worksheet." });
    }
  }, [measureCanvasWidth, getLayoutPage]);

  useEffect(() => {
    void initCanvas();
    return () => {
      handleRef.current?.dispose();
      setCanvasHandle(null);
    };
  }, [initCanvas]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const handle = handleRef.current;
      if (!handle || !canvasReady) return;
      const width = measureCanvasWidth();
      const pg = documentRef.current.pages[pageIndexRef.current];
      void handle.resizeToWidth(width, pg, documentRef.current.meta.classLevel, getLayoutPage(pageIndexRef.current));
      void handle.renderPage(pg, documentRef.current.meta.colorMode, documentRef.current.meta.classLevel, getLayoutPage(pageIndexRef.current));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [canvasReady, measureCanvasWidth, getLayoutPage]);

  useEffect(() => {
    const h = handleRef.current;
    if (h && page) {
      void h.renderPage(page, colorMode, document.meta.classLevel, getLayoutPage(pageIndex)).then(() => h.resetViewport());
    }
  }, [page, document.version, colorMode, pageIndex, getLayoutPage]);

  const syncDocumentFromCanvas = useCallback(() => {
    const handle = handleRef.current;
    if (!handle || !onDocumentChange || !page) return;
    const updatedPage = handle.exportPageState(page);
    const pages = document.pages.map((p, i) => (i === pageIndex ? updatedPage : p));
    onDocumentChange({
      ...document,
      pages,
      version: document.version + 1,
      meta: { ...document.meta, updatedAt: new Date().toISOString() },
    });
  }, [document, onDocumentChange, page, pageIndex]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    const detach = handle.onPageModified(() => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(syncDocumentFromCanvas, 600);
    });
    return () => {
      detach();
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [canvasHandle, syncDocumentFromCanvas]);

  useEffect(() => {
    const isTyping = () => {
      const el = window.document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.getAttribute("contenteditable") === "true";
    };
    const onKey = (e: KeyboardEvent) => {
      const h = handleRef.current;
      if (!h || isTyping()) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); h.undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); h.redo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); h.duplicateSelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "c") { h.copySelected(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "v") { e.preventDefault(); h.pasteClipboard(); }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); h.deleteSelected(); }
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            void import("./image-service").then(({ readFileAsDataUrl }) =>
              readFileAsDataUrl(file).then((url) => handleRef.current?.addImageFromDataUrl(url)),
            );
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const goPage = (delta: number) => {
    setPageFlip(true);
    setTimeout(() => setPageFlip(false), 280);
    void hapticWorksheetTap();
    setPageIndex((i) => Math.max(0, Math.min(document.pages.length - 1, i + delta)));
  };

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [contextMenu]);

  const gestures = useWorksheetGestures({
    onSwipeLeft: () => goPage(1),
    onSwipeRight: () => goPage(-1),
    onPinchZoom: (factor) => {
      pinchFactorRef.current *= factor;
      if (pinchRafRef.current) return;
      pinchRafRef.current = requestAnimationFrame(() => {
        const handle = handleRef.current;
        if (handle) handle.setZoom(handle.getZoom() * pinchFactorRef.current);
        pinchFactorRef.current = 1;
        pinchRafRef.current = null;
      });
    },
    onPan: (dx, dy) => handleRef.current?.panBy(dx, dy),
    onRotate: (deg) => handleRef.current?.rotateSelected(deg),
    onLongPress: (x, y) => setContextMenu({ x, y }),
    allowPageSwipe: !gridOn,
  });

  const h = () => handleRef.current;

  const openHistory = async () => {
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const v = await listVersions(document.id);
      setVersions(v);
    } catch {
      toast.error("Could not load version history");
      setVersions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportDoc = () => applyPrintMode(prepareWorksheetForExport(document), printMode);

  const handleExportPdf = async () => {
    setExportBusy(true);
    setExportProgress(10);
    trackWorksheetEvent("worksheet_export_pdf");
    syncDocumentFromCanvas();
    const prepared = exportDoc();
    try {
      await exportAndDownloadBestPdf(prepared, async (idx) => {
        const pg = document.pages[idx];
        if (!pg || !handleRef.current) return new Uint8Array();
        const prepPage = prepared.pages[idx] ?? pg;
        await handleRef.current.renderPage(prepPage, prepared.meta.colorMode, prepared.meta.classLevel, getLayoutPage(pageIndex));
        setExportProgress(10 + Math.round(((idx + 1) / document.pages.length) * 80));
        const dataUrl = handleRef.current.toDataURL(EXPORT_SCALE_MULTIPLIER);
        const b64 = dataUrl.split(",")[1] ?? "";
        return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      });
      setExportProgress(100);
      if (page && handleRef.current) {
        await handleRef.current.renderPage(page, colorMode, document.meta.classLevel, getLayoutPage(pageIndex));
      }
    } catch (err) {
      toast.error("PDF export failed", { description: "Please try again." });
      void import("@/features/teacher-os/teacher-os-analytics").then((m) => {
        m.trackExportFailure("pdf", err instanceof Error ? err.message : "unknown");
      }).catch(() => { /* */ });
      throw new Error("PDF export failed");
    } finally {
      setExportBusy(false);
      setExportProgress(0);
    }
  };

  const handleExportAnswerKey = async () => {
    setExportBusy(true);
    try {
      const key = generateAnswerKeyDocument(document);
      await exportAndDownloadBestPdf(key);
    } catch {
      toast.error("Answer key export failed");
      throw new Error("Answer key export failed");
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <div className={cn(WS_PAGE, "flex flex-col")}>
      <header className={WS_EDITOR_HEADER}>
        <Button
          variant="outline"
          className={cn(WS_OUTLINE_BTN, "h-11 shrink-0 gap-1 px-2.5 touch-manipulation sm:px-3")}
          onClick={onBack}
          aria-label="Back to Worksheet Studio home"
        >
          <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-sm font-semibold">Studio</span>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1e3a5f]">{document.meta.topic}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Page {pageIndex + 1} / {document.pages.length}</p>
            <WorksheetAutosaveIndicator state={saveState} savedAt={savedAt} onHistory={() => void openHistory()} />
          </div>
        </div>
        <Button variant="outline" size="icon" className="hidden h-11 w-11 touch-manipulation sm:inline-flex" disabled={pageIndex === 0} onClick={() => goPage(-1)} aria-label="Previous page">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" className="hidden h-11 w-11 touch-manipulation sm:inline-flex" disabled={pageIndex >= document.pages.length - 1} onClick={() => goPage(1)} aria-label="Next page">
          <ChevronRight className="h-5 w-5" />
        </Button>
        <Button
          variant={gridOn ? "default" : "outline"}
          size="icon"
          className="hidden h-11 w-11 touch-manipulation sm:inline-flex"
          onClick={() => {
            const next = !gridOn;
            setGridOn(next);
            canvasHandle?.setGridVisible(next);
          }}
          aria-label="Toggle grid"
        >
          <Grid3x3 className="h-5 w-5" />
        </Button>
        <Button
          variant={safeAreaOn ? "default" : "outline"}
          size="icon"
          className="hidden h-11 w-11 touch-manipulation sm:inline-flex"
          onClick={() => {
            const next = !safeAreaOn;
            setSafeAreaOn(next);
            canvasHandle?.setSafeAreaVisible(next);
          }}
          aria-label="Toggle safe print area"
        >
          <Ruler className="h-5 w-5" />
        </Button>
        <Button
          variant={layoutDebugOn ? "default" : "outline"}
          size="icon"
          className="hidden h-11 w-11 touch-manipulation sm:inline-flex"
          onClick={() => setLayoutDebugOn((v) => !v)}
          aria-label="Toggle layout debug overlay"
          title="Layout tree debug"
        >
          <Ruler className="h-5 w-5 rotate-90" />
        </Button>
        <Button variant="outline" size="icon" className="h-11 w-11 touch-manipulation" onClick={() => canvasHandle?.resetViewport()} aria-label="Reset zoom">
          <Maximize2 className="h-5 w-5" />
        </Button>
      </header>

      {showImagePicker && (
        <div className="border-b bg-white/90 px-3 py-2">
          <WorksheetImagePicker
            onImage={(url) => { void h()?.addImageFromDataUrl(url); setShowImagePicker(false); }}
          />
        </div>
      )}

      <div
        className={WS_EDITOR_VIEWPORT}
        {...gestures}
        role="application"
        aria-label="Worksheet editor canvas"
      >
        <div
          ref={canvasContainerRef}
          className={cn(WS_PAPER_SHADOW, WS_EDITOR_CANVAS, "relative transition-all duration-300 ease-out", pageFlip && "scale-[0.97] opacity-85 rotate-[0.5deg]")}
        >
          {!canvasReady && !canvasError && (
            <div className="absolute inset-0 z-10 flex min-h-[min(70dvh,40rem)] items-center justify-center rounded-2xl bg-white" role="status" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" aria-hidden />
              <span className="sr-only">Loading editor</span>
            </div>
          )}
          {canvasError && (
            <div className="flex min-h-[min(70dvh,40rem)] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-6 text-center" role="alert">
              <p className="text-sm font-semibold text-[#1e3a5f]">Editor could not load</p>
              <Button variant="outline" onClick={() => void initCanvas()}>Retry</Button>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={cn("mx-auto block max-w-full touch-manipulation worksheet-print-target", canvasError && "hidden")}
            aria-hidden={!canvasReady || canvasError}
          />
          {canvasReady && (
            <WorksheetLayoutDebugOverlay
              layoutTree={layoutTree}
              pageIndex={pageIndex}
              scale={canvasHandle?.scale ?? 1}
              visible={layoutDebugOn}
            />
          )}
        </div>
      </div>

      {previewOpen && (
        <div
          className={cn(WS_OVERLAY, "z-50 items-center bg-black/70")}
          onClick={() => setPreviewOpen(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setPreviewOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Worksheet preview"
        >
          {h()?.toDataURL(EXPORT_SCALE_MULTIPLIER) ? (
            <img src={h()!.toDataURL(EXPORT_SCALE_MULTIPLIER)} alt="Worksheet preview" className="max-h-full max-w-full rounded-lg bg-white shadow-2xl" />
          ) : (
            <p className="rounded-lg bg-white px-6 py-4 text-sm text-muted-foreground">Preview unavailable</p>
          )}
        </div>
      )}

      {contextMenu && (
        <div
          className={WS_CONTEXT_MENU}
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 160), top: contextMenu.y }}
          role="menu"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {(
            [
              ["Duplicate", () => { h()?.duplicateSelected(); }],
              ["Copy", () => { h()?.copySelected(); }],
              ["Paste", () => { h()?.pasteClipboard(); }],
              ["Add image", () => { setShowImagePicker(true); }],
              ["Delete", () => { h()?.deleteSelected(); }],
            ] as const
          ).map(([label, action]) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              aria-label={label}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted touch-manipulation min-h-11"
              onClick={() => { action(); setContextMenu(null); }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <WorksheetPropertyPanel
        handle={canvasHandle}
        onReplaceImage={() => setShowImagePicker(true)}
      />

      <WorksheetAiAssistant
        busy={copilotBusy || improving !== null}
        onAction={(a) => void onImprove(a)}
        onCopilotMessage={onCopilotMessage}
      />

      <WorksheetToolbar
        onBack={onBack}
        onText={() => h()?.addTextBox()}
        onImage={() => setShowImagePicker((v) => !v)}
        onShape={() => h()?.addRectShape()}
        onUndo={() => h()?.undo()}
        onRedo={() => h()?.redo()}
        onDelete={() => h()?.deleteSelected()}
        onDuplicate={() => h()?.duplicateSelected()}
        onCopy={() => h()?.copySelected()}
        onPaste={() => h()?.pasteClipboard()}
        onGroup={() => h()?.groupSelected()}
        onPreview={() => setPreviewOpen(true)}
        onExport={() => setExportOpen(true)}
        onBold={() => h()?.toggleBold()}
        onAlign={(a) => h()?.setTextAlign(a)}
        onLock={() => h()?.toggleLock()}
        onLayer={(dir) => (dir === "up" ? h()?.bringToFront() : h()?.sendToBack())}
        onFlip={() => h()?.flipHorizontal()}
        onRotate={() => h()?.rotateSelected(90)}
      />

      <WorksheetExportSheet
        open={exportOpen}
        onOpenChange={setExportOpen}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        busy={exportBusy}
        progress={exportProgress}
        onPdf={handleExportPdf}
        onAnswerKey={document.meta.isAnswerKey ? undefined : handleExportAnswerKey}
        onDocx={async () => {
          syncDocumentFromCanvas();
          try {
            await exportWorksheetDocx(exportDoc());
          } catch (err) {
            void import("@/features/teacher-os/teacher-os-analytics").then((m) => {
              m.trackExportFailure("docx", err instanceof Error ? err.message : "unknown");
            }).catch(() => { /* */ });
            throw err;
          }
        }}
        onPng={async () => {
          const url = h()?.toDataURL(EXPORT_SCALE_MULTIPLIER);
          if (!url) throw new Error("Canvas not ready");
          await exportCanvasPng(url, `worksheet-page-${pageIndex + 1}.png`);
        }}
        onJpeg={async () => {
          const url = h()?.toDataURL(EXPORT_SCALE_MULTIPLIER);
          if (!url) throw new Error("Canvas not ready");
          await exportCanvasJpeg(url, `worksheet-page-${pageIndex + 1}.jpg`);
        }}
        onPrint={() => {
          syncDocumentFromCanvas();
          if (document.pages.length > 1) {
            toast.info("Printing current page", {
              description: "For all pages, use PDF export.",
            });
          }
          window.print();
        }}
        onShare={async () => {
          const url = h()?.toDataURL(EXPORT_SCALE_MULTIPLIER);
          if (!url) throw new Error("Canvas not ready");
          const res = await fetch(url);
          if (!res.ok) throw new Error("Share failed");
          const blob = await res.blob();
          await shareWorksheetFile(new File([blob], "worksheet.png", { type: "image/png" }), document.meta.title);
        }}
      />

      <WorksheetDraftHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={versions}
        loading={historyLoading}
        onRestore={(v) => onRestoreVersion(v.document)}
      />
    </div>
  );
}
