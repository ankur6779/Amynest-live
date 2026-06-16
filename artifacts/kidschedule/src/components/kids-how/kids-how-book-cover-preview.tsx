import { parseApiJson } from "@/lib/safe-json-response";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Loader2 } from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { kidsHowPreviewApiPath } from "@/lib/kids-how-books";
import { pdfPreviewDocumentInit } from "@/lib/pdf-preview-document";
import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = pdfWorker;

type KidsHowBookCoverPreviewProps = {
  bookId: string;
  title: string;
  enabled?: boolean;
  className?: string;
};

export function KidsHowBookCoverPreview({
  bookId,
  title,
  enabled = true,
  className,
}: KidsHowBookCoverPreviewProps) {
  const authFetch = useAuthFetch();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState(false);

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ["kids-how-cover", bookId],
    enabled: enabled && Boolean(bookId),
    queryFn: async () => {
      const res = await authFetch(kidsHowPreviewApiPath(bookId));
      if (!res.ok) throw new Error("preview_failed");
      return parseApiJson(res) as Promise<{ url: string }>;
    },
    staleTime: 25 * 60 * 1000,
  });

  useEffect(() => {
    if (!enabled || !preview?.url) return;

    let cancelled = false;
    setRenderError(false);

    void (async () => {
      try {
        const doc = await getDocument(pdfPreviewDocumentInit(preview.url)).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }

        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) {
          void doc.destroy();
          return;
        }

        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = container.clientWidth || viewport.width;
        const scale = containerWidth / viewport.width;
        const scaled = page.getViewport({ scale });
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          void doc.destroy();
          return;
        }

        canvas.width = Math.floor(scaled.width);
        canvas.height = Math.floor(scaled.height);
        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
        void doc.destroy();
      } catch {
        if (!cancelled) setRenderError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId, enabled, preview?.url]);

  const showFallback = isError || renderError;
  const showLoading = enabled && (isLoading || (!showFallback && !preview?.url));

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "h-full w-full object-cover object-top",
          (showLoading || showFallback) && "opacity-0",
        )}
      />
      {showLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20">
          <Loader2 className="h-6 w-6 animate-spin text-amber-300/80" />
        </div>
      ) : null}
      {showFallback ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500/25 via-violet-500/15 to-cyan-500/10 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <BookOpen className="h-7 w-7 text-amber-200" aria-hidden />
          </div>
          <p className="line-clamp-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
        </div>
      ) : null}
    </div>
  );
}
