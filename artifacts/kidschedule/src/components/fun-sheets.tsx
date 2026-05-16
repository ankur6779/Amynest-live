"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDown, Eye, Download, Loader2, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { resolveApiMediaUrl } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
interface FunsheetFile {
  id: string;
  name: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloaded: boolean;
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
  files: FunsheetFile[];
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

export function FunSheets({
  childId,
  childName
}: {
  childId: number | string;
  childName: string;
}) {
  const {
    t
  } = useTranslation();
  const numericChildId = useMemo(() => {
    if (typeof childId === "number") return childId;
    const n = Number(childId);
    return Number.isFinite(n) ? n : null;
  }, [childId]);
  const authFetch = useAuthFetch();
  const [page, setPage] = useState(0);
  const [files, setFiles] = useState<FunsheetFile[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [quota, setQuota] = useState<DailyQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<FunsheetFile | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const fetchPage = useCallback(async (targetPage: number, signal?: AbortSignal) => {
    if (numericChildId === null) {
      setListError("Please select a child to see Fun Sheets.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError(null);
    try {
      const res = await authFetch(`/api/funsheets/list?childId=${numericChildId}&page=${targetPage}`, {
        signal
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (body.error === "google_api_key_missing") {
          setListError("Fun Sheets are temporarily unavailable. Please check back soon.");
        } else {
          setListError("Couldn't load Fun Sheets. Please try again.");
        }
        setFiles([]);
        setPagination(null);
        return;
      }
      const data = (await res.json()) as ListResponse;
      setFiles(data.files);
      setPagination(data.pagination);
      setQuota(data.dailyQuota);
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
  }, [authFetch, numericChildId]);
  useEffect(() => {
    const ctrl = new AbortController();
    void fetchPage(page, ctrl.signal);
    return () => ctrl.abort();
  }, [fetchPage, page]);
  const handlePrev = () => setPage(p => Math.max(0, p - 1));
  const handleNext = () => setPage(p => p + 1);
  const handleRetry = () => fetchPage(page);
  const handleDownload = useCallback(async (file: FunsheetFile) => {
    if (numericChildId === null) return;
    setDownloadingId(file.id);
    setRowError(null);
    try {
      const res = await authFetch("/api/funsheets/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          childId: numericChildId,
          fileId: file.id
        })
      });
      const body = (await res.json()) as DownloadResponse;
      if (!res.ok) {
        if (body.error === "daily_limit_reached") {
          setQuota(body.dailyQuota ?? null);
          setRowError({
            id: file.id,
            message: `Daily limit reached (${quota?.limit ?? 2}/day)`
          });
        } else if (body.error === "already_downloaded") {
          window.open(resolveApiMediaUrl(`/api/drive/download/${file.id}?name=${encodeURIComponent(file.name)}`), "_blank");
        } else {
          setRowError({
            id: file.id,
            message: "Download failed. Please try again."
          });
        }
        return;
      }
      if (body.downloadUrl) {
        window.open(resolveApiMediaUrl(body.downloadUrl), "_blank");
      }
      if (body.dailyQuota) setQuota(body.dailyQuota);
      // Mark as downloaded in local state
      setFiles(prev => prev.map(f => f.id === file.id ? {
        ...f,
        downloaded: true
      } : f));
    } catch {
      setRowError({
        id: file.id,
        message: "Network error. Please try again."
      });
    } finally {
      setDownloadingId(null);
    }
  }, [authFetch, numericChildId, quota]);
  const quotaExhausted = quota !== null && quota.remaining <= 0;
  return <div className="space-y-4" data-testid="fun-sheets-section">
      {/* Daily quota banner */}
      {quota && <div data-testid="funsheet-quota-banner" className={["flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm", quotaExhausted ? "bg-muted dark:bg-card border border-border dark:border-primary text-primary dark:text-muted-foreground" : "bg-muted dark:bg-card border border-border dark:border-primary text-primary dark:text-muted-foreground"].join(" ")}>
          <span className="flex items-center gap-2 font-semibold">
            <FileDown className="h-4 w-4" />
            {quotaExhausted ? `Daily limit reached for ${childName}` : `${quota.remaining} of ${quota.limit} downloads left today`}
          </span>
          {quotaExhausted && <span className="text-xs opacity-80">{t("components.fun_sheets.resets_at_midnight_ist")}</span>}
        </div>}

      {/* Loading */}
      {loading && <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>}

      {/* Error */}
      {!loading && listError && <Card className="bg-white/60 dark:bg-white/[0.04] border border-white/50 dark:border-white/10 rounded-2xl">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{listError}</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="rounded-xl gap-2">
              <RefreshCw className="h-4 w-4" />
              {t("components.fun_sheets.try_again")}
            </Button>
          </CardContent>
        </Card>}

      {/* Empty state — all downloaded */}
      {!loading && !listError && pagination !== null && pagination.total === 0 && <Card className="bg-white/60 dark:bg-white/[0.04] border border-white/50 dark:border-white/10 rounded-2xl">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
            <p className="font-quicksand font-bold text-base text-foreground">
              {t("components.fun_sheets.all_caught_up")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {childName} {t("components.fun_sheets.has_downloaded_every_fun_sheet_in_the_library_we_add_new_one")}
            </p>
          </CardContent>
        </Card>}

      {/* 2-column PDF card grid */}
      {!loading && !listError && files.length > 0 && <>
          <div className="grid grid-cols-2 gap-3" data-testid="funsheet-grid">
            {files.map(file => {
          const isDownloading = downloadingId === file.id;
          const thisRowError = rowError?.id === file.id ? rowError.message : null;
          const canDownload = !quotaExhausted || file.downloaded;
          return <div key={file.id} data-testid={`funsheet-card-${file.id}`} className={["group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-200", "bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl", file.downloaded ? "border-border dark:border-border opacity-70" : "border-white/60 dark:border-white/10 hover:border-border"].join(" ")}>
                  {/* Thumbnail */}
                  <div className="relative aspect-[3/4] w-full bg-muted/30 overflow-hidden">
                    <ThumbnailWithFallback src={file.thumbnailUrl} alt={file.name} />
                    {file.downloaded && <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <CheckCircle2 className="h-8 w-8 text-white drop-shadow" />
                      </div>}
                    {/* Preview overlay button */}
                    <button onClick={() => setPreviewing(file)} aria-label={`Preview ${file.name}`} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-black/70 px-3 py-1.5 text-xs font-bold text-foreground shadow">
                        <Eye className="h-3.5 w-3.5" />
                        {t("components.fun_sheets.preview")}
                      </span>
                    </button>
                  </div>

                  {/* Info + actions */}
                  <div className="flex flex-col gap-2 p-2.5">
                    <p className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2" title={file.name}>
                      {file.name}
                    </p>

                    {thisRowError && <p className="text-[11px] text-destructive font-medium leading-tight">
                        {thisRowError}
                      </p>}

                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setPreviewing(file)} className="flex-1 rounded-xl text-[11px] h-7 gap-1 px-2" data-testid={`funsheet-preview-btn-${file.id}`}>
                        <Eye className="h-3 w-3" />
                        {t("components.fun_sheets.view")}
                      </Button>
                      <Button size="sm" onClick={() => handleDownload(file)} disabled={isDownloading || !canDownload && !file.downloaded} className={["flex-1 rounded-xl text-[11px] h-7 gap-1 px-2", file.downloaded ? "bg-primary text-primary dark:text-muted-foreground border border-border hover:bg-primary" : "bg-primary hover:bg-primary text-white"].join(" ")} data-testid={`funsheet-download-btn-${file.id}`}>
                        {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        {file.downloaded ? "Again" : "Get"}
                      </Button>
                    </div>
                  </div>
                </div>;
        })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-center gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={!pagination.hasPrev || loading} data-testid="funsheet-prev-button" className="gap-1 rounded-xl">
                <ChevronLeft className="h-4 w-4" />
                {t("components.fun_sheets.prev")}
              </Button>
              <Badge variant="outline" data-testid="funsheet-page-indicator" className="rounded-full px-3 py-1 font-bold text-[11px]">
                {t("components.fun_sheets.page")} {pagination.page + 1} of {pagination.totalPages}
                <span className="text-muted-foreground ml-1.5">· {pagination.total} {t("components.fun_sheets.sheets")}</span>
              </Badge>
              <Button variant="outline" size="sm" onClick={handleNext} disabled={!pagination.hasNext || loading} data-testid="funsheet-next-button" className="gap-1 rounded-xl">
                {t("components.fun_sheets.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>}
        </>}

      {/* Preview dialog */}
      <Dialog open={previewing !== null} onOpenChange={open => {
      if (!open) setPreviewing(null);
    }}>
        <DialogContent className="max-w-3xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden" data-testid="funsheet-preview-dialog">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-base font-quicksand truncate pr-6">
              {previewing?.name ?? "Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewing && <div className="flex-1 w-full h-full bg-muted/30 overflow-hidden">
              <iframe key={previewing.id} src={previewing.previewUrl} title={previewing.name} className="w-full h-full border-0" allow="autoplay" sandbox="allow-scripts allow-same-origin" />
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}

// ─── Sub-component: thumbnail with graceful fallback ─────────────────────────

function ThumbnailWithFallback({
  src,
  alt
}: {
  src: string;
  alt: string;
}) {
  const {
    t
  } = useTranslation();
  const [errored, setErrored] = useState(false);
  if (errored) {
    return <div className="flex flex-col items-center justify-center text-primary dark:text-muted-foreground p-4 w-full h-full">
        <FileDown className="h-10 w-10 mb-1.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">{t("components.fun_sheets.pdf")}</span>
      </div>;
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setErrored(true)} className="w-full h-full object-contain" />;
}