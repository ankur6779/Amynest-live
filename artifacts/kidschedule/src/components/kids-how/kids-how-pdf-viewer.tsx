import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { pdfPreviewDocumentInit } from "@/lib/pdf-preview-document";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getKidsHowLastPage,
  saveKidsHowLastPage,
} from "@/lib/kids-how-reading-progress";

GlobalWorkerOptions.workerSrc = pdfWorker;

type KidsHowPdfViewerProps = {
  bookId: string;
  url: string;
  onPageChange?: (page: number, total: number) => void;
};

export function KidsHowPdfViewer({
  bookId,
  url,
  onPageChange,
}: KidsHowPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [page, setPage] = useState(() => getKidsHowLastPage(bookId));
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const renderPage = useCallback(
    async (doc: PDFDocumentProxy, pageNum: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      renderTaskRef.current?.cancel();
      setRendering(true);

      try {
        const pdfPage = await doc.getPage(pageNum);
        const viewport = pdfPage.getViewport({ scale: 1 });
        const containerWidth = container.clientWidth || viewport.width;
        const scale = containerWidth / viewport.width;
        const scaled = pdfPage.getViewport({ scale });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(scaled.width);
        canvas.height = Math.floor(scaled.height);

        const task = pdfPage.render({ canvasContext: ctx, viewport: scaled });
        renderTaskRef.current = task;
        await task.promise;
        saveKidsHowLastPage(bookId, pageNum);
        onPageChange?.(pageNum, doc.numPages);
      } finally {
        setRendering(false);
      }
    },
    [bookId, onPageChange],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    docRef.current = null;

    void (async () => {
      try {
        const task = getDocument(pdfPreviewDocumentInit(url));
        const doc = await task.promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        docRef.current = doc;
        const total = doc.numPages;
        setTotalPages(total);
        const initial = Math.min(Math.max(1, getKidsHowLastPage(bookId)), total);
        setPage(initial);
        await renderPage(doc, initial);
      } catch {
        if (!cancelled) setError("Couldn't load this book. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      void docRef.current?.destroy();
      docRef.current = null;
    };
  }, [bookId, url, renderPage]);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc || loading || page < 1) return;
    void renderPage(doc, page);
  }, [page, loading, renderPage]);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () =>
    setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1));

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      setFullscreen((v) => !v);
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-[50vh] flex-col rounded-2xl border border-white/10 bg-black/30",
        fullscreen && "fixed inset-0 z-[80] min-h-screen rounded-none border-0 bg-background",
      )}
    >
      {(loading || rendering) && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
          aria-busy
          aria-label="Loading PDF"
        >
          <div className="h-48 w-full max-w-md animate-pulse rounded-xl bg-white/5" />
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <p className="text-sm text-muted-foreground">Opening book…</p>
        </div>
      )}

      {error ? (
        <p className="p-8 text-center text-sm text-destructive">{error}</p>
      ) : (
        <div className="flex flex-1 items-start justify-center overflow-auto p-2 sm:p-4">
          <canvas ref={canvasRef} className="max-w-full shadow-lg" />
        </div>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-background/95 px-3 py-3 backdrop-blur-md">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={goPrev}
            disabled={page <= 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[5rem] text-center text-xs font-semibold tabular-nums text-foreground">
            {totalPages > 0 ? `${page} / ${totalPages}` : "—"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={goNext}
            disabled={!totalPages || page >= totalPages || loading}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-xl gap-1.5 text-xs font-semibold"
          onClick={() => void toggleFullscreen()}
        >
          {fullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          {fullscreen ? "Exit fullscreen" : "Fullscreen"}
        </Button>
      </div>
    </div>
  );
}
