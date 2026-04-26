"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Palette,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ColoringFile {
  id: string;
  name: string;
  thumbnailUrl: string;
  previewUrl: string;
}

interface DailyQuota {
  limit: number;
  used: number;
  remaining: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ListResponse {
  ok: boolean;
  files: ColoringFile[];
  pagination: Pagination;
  dailyQuota: DailyQuota;
}

interface DownloadResponse {
  ok?: boolean;
  downloadUrl?: string;
  dailyQuota?: DailyQuota;
  error?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ColoringBooks({
  childId,
  childName,
}: {
  childId: number | string;
  childName: string;
}) {
  const numericChildId = useMemo(() => {
    if (typeof childId === "number") return childId;
    const n = Number(childId);
    return Number.isFinite(n) ? n : null;
  }, [childId]);

  const authFetch = useAuthFetch();

  const [page, setPage] = useState(0);
  const [files, setFiles] = useState<ColoringFile[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [quota, setQuota] = useState<DailyQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<ColoringFile | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(
    null,
  );

  // Fetch the current page from the server.
  const fetchPage = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      if (numericChildId === null) {
        setListError("Please select a child to see coloring books.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setListError(null);
      try {
        const res = await authFetch(
          `/api/coloring/list?childId=${numericChildId}&page=${targetPage}`,
          { signal },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          if (body.error === "google_api_key_missing") {
            setListError(
              "Coloring Books are temporarily unavailable. Please check back soon.",
            );
          } else {
            setListError("Couldn't load coloring books. Please try again.");
          }
          setFiles([]);
          setPagination(null);
          return;
        }
        const data = (await res.json()) as ListResponse;
        setFiles(data.files);
        setPagination(data.pagination);
        setQuota(data.dailyQuota);
        // Server may have clamped the page (e.g. on last-page after a download).
        if (data.pagination.page !== targetPage) {
          setPage(data.pagination.page);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setListError("Network error — please check your connection.");
        setFiles([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [authFetch, numericChildId],
  );

  // Re-fetch when child or page changes.
  useEffect(() => {
    const ctrl = new AbortController();
    void fetchPage(page, ctrl.signal);
    return () => ctrl.abort();
  }, [fetchPage, page]);

  const handlePrev = () => {
    if (pagination?.hasPrev) setPage((p) => Math.max(0, p - 1));
  };
  const handleNext = () => {
    if (pagination?.hasNext) setPage((p) => p + 1);
  };

  const handleDownload = async (file: ColoringFile) => {
    if (downloadingId !== null || numericChildId === null) return;
    if (quota && quota.remaining <= 0) {
      setRowError({ id: file.id, message: "Daily limit reached. Try again tomorrow." });
      return;
    }
    setDownloadingId(file.id);
    setRowError(null);
    try {
      const res = await authFetch("/api/coloring/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: numericChildId, fileId: file.id }),
      });
      const data = (await res.json().catch(() => ({}))) as DownloadResponse;

      if (!res.ok) {
        if (res.status === 429) {
          if (data.dailyQuota) setQuota(data.dailyQuota);
          setRowError({
            id: file.id,
            message: "Daily limit reached. Try again tomorrow.",
          });
        } else if (res.status === 409) {
          setRowError({
            id: file.id,
            message: "Already downloaded — refreshing list.",
          });
          await fetchPage(page);
        } else if (res.status === 401) {
          setRowError({ id: file.id, message: "Please sign in again to download." });
        } else {
          setRowError({
            id: file.id,
            message: "Download failed. Please try again.",
          });
        }
        return;
      }

      if (!data.downloadUrl) {
        setRowError({ id: file.id, message: "Server didn't return a download link." });
        return;
      }

      // Open Drive's download URL in a new tab so the browser handles the
      // file save. Drive's `uc?export=download` URL streams the PDF directly
      // for files under ~100MB.
      window.open(data.downloadUrl, "_blank", "noopener");

      if (data.dailyQuota) setQuota(data.dailyQuota);
      // The downloaded file should disappear from the list. Refetching the
      // current page is the simplest way to keep server state authoritative.
      await fetchPage(page);
    } catch {
      setRowError({
        id: file.id,
        message: "Network error — please check your connection.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading && files.length === 0 && !listError) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading coloring books…
      </div>
    );
  }

  if (listError) {
    return (
      <Card className="bg-red-50/60 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 rounded-2xl">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-300 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-200">{listError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => void fetchPage(page)}
              data-testid="coloring-retry-button"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const quotaExhausted = quota !== null && quota.remaining <= 0;
  const allDone = pagination !== null && pagination.total === 0;

  return (
    <div className="space-y-4" data-testid="coloring-books-section">
      {/* Daily quota banner */}
      {quota && (
        <div
          data-testid="coloring-quota-banner"
          className={[
            "flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm",
            quotaExhausted
              ? "bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200"
              : "bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200",
          ].join(" ")}
        >
          <span className="flex items-center gap-2 font-semibold">
            <Palette className="h-4 w-4" />
            {quotaExhausted
              ? `Daily limit reached for ${childName}`
              : `${quota.remaining} of ${quota.limit} downloads left today`}
          </span>
          {quotaExhausted && (
            <span className="text-xs opacity-80">Resets at midnight (IST)</span>
          )}
        </div>
      )}

      {/* "All done" empty state */}
      {allDone ? (
        <Card className="bg-white/60 dark:bg-white/[0.04] border border-white/50 dark:border-white/10 rounded-2xl">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-quicksand font-bold text-base text-foreground">
              All caught up!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {childName} has downloaded every coloring book in the library.
              We add new ones regularly — check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 2-column grid of up to 4 cards */}
          <div className="grid grid-cols-2 gap-3">
            {files.map((file) => {
              const isDownloading = downloadingId === file.id;
              const showRowError = rowError?.id === file.id;
              return (
                <Card
                  key={file.id}
                  data-testid={`coloring-card-${file.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-rose-300/60 hover:shadow-[0_0_0_1px_rgba(244,63,94,0.25),0_10px_36px_-10px_rgba(244,63,94,0.30)] transition-all"
                >
                  <CardContent className="p-3">
                    <div className="aspect-[3/4] w-full mb-3 overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 ring-1 ring-rose-200/50 dark:ring-rose-400/20 flex items-center justify-center">
                      <ThumbnailWithFallback
                        src={file.thumbnailUrl}
                        alt={file.name}
                      />
                    </div>
                    <p
                      className="font-quicksand font-bold text-[13px] leading-tight text-foreground line-clamp-2 mb-2 min-h-[2.4em]"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 px-2 text-[11px] gap-1 rounded-xl"
                        onClick={() => setPreviewing(file)}
                        data-testid={`coloring-preview-${file.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        disabled={isDownloading || quotaExhausted}
                        onClick={() => void handleDownload(file)}
                        data-testid={`coloring-download-${file.id}`}
                        className="flex-1 h-8 px-2 text-[11px] gap-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white disabled:opacity-60"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        {isDownloading ? "Saving" : "Download"}
                      </Button>
                    </div>
                    {showRowError && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 mt-2 flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{rowError!.message}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={!pagination.hasPrev || loading}
                data-testid="coloring-prev-button"
                className="gap-1 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Badge
                variant="outline"
                data-testid="coloring-page-indicator"
                className="rounded-full px-3 py-1 font-bold text-[11px]"
              >
                Page {pagination.page + 1} of {pagination.totalPages}
                <span className="text-muted-foreground ml-1.5">
                  · {pagination.total} left
                </span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!pagination.hasNext || loading}
                data-testid="coloring-next-button"
                className="gap-1 rounded-xl"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Preview dialog */}
      <Dialog
        open={previewing !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewing(null);
        }}
      >
        <DialogContent
          className="max-w-3xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden"
          data-testid="coloring-preview-dialog"
        >
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-base font-quicksand truncate pr-6">
              {previewing?.name ?? "Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="flex-1 w-full h-full bg-muted/30 overflow-hidden">
              <iframe
                key={previewing.id}
                src={previewing.previewUrl}
                title={previewing.name}
                className="w-full h-full border-0"
                allow="autoplay"
                // sandbox blocks Drive's "open in Drive" / download buttons
                // while still allowing scroll and the rendered PDF preview.
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-component: thumbnail with graceful fallback ─────────────────────────

function ThumbnailWithFallback({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="flex flex-col items-center justify-center text-rose-400 dark:text-rose-300 p-4">
        <Palette className="h-10 w-10 mb-1.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          PDF
        </span>
      </div>
    );
  }
  return (
    // Drive thumbnails are CDN-hosted; loading="lazy" + a fallback covers the
    // few cases where Drive hasn't generated a thumbnail yet.
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className="w-full h-full object-contain"
    />
  );
}
