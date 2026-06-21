import { parseApiJson, safeJsonResponse } from "@/lib/safe-json-response";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import amyLogo from "@assets/ChatGPT_Image_Apr_19,_2026,_01_56_21_PM_1776587201948.png";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  parseHubQuotaHeaders,
  savePdfFromResponse,
  type HubDownloadWallet,
} from "@/lib/hub-pdf-download";
import { useRecordLearningActivity } from "@/hooks/use-record-learning-activity";
import { worksheetProgressSummary } from "@workspace/learning-progress-engine";
import {
  WorksheetAmyTips,
  WorksheetProgressReport,
} from "@/components/learning-progress";
interface Worksheet {
  id: string;
  name: string;
  mimeType: string;
  fileType: "pdf" | "image";
  category: string;
  previewUrl: string;
  downloaded: boolean;
}
interface DailyQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
}
interface LifetimeQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
}
interface ListResponse {
  ok: boolean;
  worksheets: Worksheet[];
  total: number;
  dailyQuota: DailyQuota;
  lifetimeQuota?: LifetimeQuota;
  downloadWallet?: HubDownloadWallet | null;
}
interface DownloadResponse {
  ok?: boolean;
  dailyQuota?: DailyQuota;
  lifetimeQuota?: LifetimeQuota;
  downloadWallet?: HubDownloadWallet;
  error?: string;
}
const PAGE_SIZE = 10;
export function PrintableWorksheets({
  childAgeMonths,
  childId,
}: {
  childAgeMonths?: number;
  childId?: number;
}) {
  const {
    t
  } = useTranslation();
  const authFetch = useAuthFetch();
  const { recordActivity } = useRecordLearningActivity(childId ?? null);
  const [all, setAll] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [quota, setQuota] = useState<DailyQuota | null>(null);
  const [lifetimeQuota, setLifetimeQuota] = useState<LifetimeQuota | null>(null);
  const [downloadWallet, setDownloadWallet] = useState<HubDownloadWallet | null>(null);
  const initRef = useRef(false);
  const loadWorksheets = useCallback(() => {
    if (!childId) {
      setError("Please select a child to see worksheets.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    authFetch(`/api/worksheets/list?childId=${childId}`).then(r => {
      if (!r.ok) return parseApiJson<{ error?: string }>(r).then((b) => {
        throw new Error(b.error || `HTTP ${r.status}`);
      });
      return parseApiJson<ListResponse>(r);
    }).then(data => {
      setAll(data.worksheets || []);
      setQuota(data.dailyQuota);
      setLifetimeQuota(data.lifetimeQuota ?? null);
      setDownloadWallet(data.downloadWallet ?? null);
    }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [authFetch, childId]);
  useEffect(() => {
    initRef.current = true;
    loadWorksheets();
  }, [loadWorksheets]);
  const handleDownload = useCallback(async (ws: Worksheet) => {
    if (!childId) return;
    if (!ws.downloaded && quota?.remaining !== null && quota?.remaining !== undefined && quota.remaining <= 0) return;
    if (!ws.downloaded && lifetimeQuota?.remaining !== null && lifetimeQuota?.remaining !== undefined && lifetimeQuota.remaining <= 0) return;
    if (downloadingId !== null) return;

    setDownloadingId(ws.id);
    setDownloadError(null);
    try {
      const res = await authFetch("/api/worksheets/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          childId,
          fileId: ws.id
        })
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("json")) {
        const body = ((await safeJsonResponse(res).then((p) => (p.ok ? p.data : {})))) as DownloadResponse;
        if (res.status === 429) {
          if (body.dailyQuota) setQuota(body.dailyQuota);
          if (body.downloadWallet) setDownloadWallet(body.downloadWallet);
          setDownloadError(body.downloadWallet
            ? "Your download wallet is empty. You receive 5 new downloads tomorrow."
            : "Daily limit reached. Try again tomorrow.");
        } else if (res.status === 402) {
          if (body.lifetimeQuota) setLifetimeQuota(body.lifetimeQuota);
          setDownloadError("Free lifetime limit reached. Upgrade for unlimited downloads.");
        } else if (res.status === 401) {
          setDownloadError("Please sign in again to download.");
        } else {
          setDownloadError(body.error === "stream_failed"
            ? "Couldn't save the PDF. Please try again."
            : "Download failed. Please try again.");
        }
        return;
      }
      const saved = await savePdfFromResponse(res, ws.name);
      if (!saved) {
        setDownloadError("Couldn't save the PDF. Please try again.");
        return;
      }
      const quotaHeaders = parseHubQuotaHeaders(res);
      if (quotaHeaders.dailyQuota) setQuota(quotaHeaders.dailyQuota);
      if (quotaHeaders.lifetimeQuota) setLifetimeQuota(quotaHeaders.lifetimeQuota);
      if (quotaHeaders.downloadWallet) setDownloadWallet(quotaHeaders.downloadWallet);
      setAll(prev => prev.map(item => item.id === ws.id ? { ...item, downloaded: true } : item));
      if (childId) {
        void recordActivity({
          activityId: `worksheet_${ws.id}`,
          section: "worksheets",
          correct: true,
          analyticsEvent: "worksheet_completed",
          metadata: { category: ws.category },
        });
      }
    } catch {
      setDownloadError("Network error — please check your connection.");
    } finally {
      setDownloadingId(null);
    }
  }, [authFetch, childId, downloadingId, lifetimeQuota, quota, recordActivity]);

  const printableProgress = useMemo(
    () => worksheetProgressSummary(all.filter(w => w.downloaded).map(w => w.id), all.length),
    [all],
  );
  const downloadedCount = all.filter(w => w.downloaded).length;
  const dailyLimit = quota?.limit ?? 0;
  const dailyUsed = quota?.used ?? 0;
  const dailyRemaining = quota?.remaining ?? 0;
  const lifetimeUsed = lifetimeQuota?.used ?? downloadedCount;
  const lifetimeLimit = lifetimeQuota?.limit;
  const lifetimeRemaining = lifetimeQuota?.remaining ?? null;
  const isDailyLimitReached = quota?.remaining !== null && quota?.remaining !== undefined && quota.remaining <= 0;
  const isLifetimeLimitReached = lifetimeQuota?.remaining !== null && lifetimeQuota?.remaining !== undefined && lifetimeQuota.remaining <= 0;
  const isLimitReached = isDailyLimitReached || isLifetimeLimitReached;
  const filtered = all
    .filter(w => !query || w.name.toLowerCase().includes(query.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  if (loading) {
    return <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "24px 0"
    }}>
        <WsSpinner />
        <span style={{
        fontSize: 14,
        color: "#888"
      }}>{t("components.printable_worksheets.loading_worksheets")}</span>
      </div>;
  }
  if (error) {
    return <div style={{
      padding: "24px 0",
      textAlign: "center"
    }}>
        <p style={{
        fontSize: 14,
        color: "hsl(var(--brand-red-600))",
        marginBottom: 14
      }}>⚠ {error}</p>
        <button onClick={() => {
        initRef.current = false;
        loadWorksheets();
      }} style={darkBtn()}>
          {t("components.printable_worksheets.try_again")}
        </button>
      </div>;
  }
  return <>
      <style>{`
        @keyframes ws-spin { to { transform: rotate(360deg); } }
        .ws-card { transition: box-shadow 0.18s, transform 0.18s; }
        .ws-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.13) !important; transform: translateY(-1px); }
        .ws-dl-btn:hover:not(:disabled) { opacity: 0.85 !important; }
        .ws-dl-btn:active:not(:disabled) { transform: scale(0.97); }
      `}</style>

      {childId && (
        <div style={{ marginBottom: 14 }}>
          <WorksheetAmyTips childId={childId} />
        </div>
      )}

      {childId && (
        <div style={{ marginBottom: 14 }}>
          <WorksheetProgressReport
            completed={printableProgress.completed}
            percent={printableProgress.percent}
            label={printableProgress.label}
            dailyRemaining={dailyRemaining}
          />
        </div>
      )}

      {downloadWallet?.enabled && <DownloadWalletCard wallet={downloadWallet} />}

      {/* Download quota badge */}
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
      background: isLimitReached ? "hsl(var(--brand-red-100))" : "hsl(var(--brand-green-100))",
      border: `1.5px solid ${isLimitReached ? "hsl(var(--brand-red-300))" : "hsl(var(--brand-green-300))"}`,
      borderRadius: 12,
      padding: "10px 14px"
    }}>
        <span style={{
        fontSize: 22
      }}>{isLimitReached ? "🚫" : "✅"}</span>
        <div>
          <p style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          color: isLimitReached ? "hsl(var(--brand-red-600))" : "hsl(var(--brand-green-600))"
        }}>
            {isLifetimeLimitReached
              ? "Lifetime free limit reached"
              : isDailyLimitReached
                ? "Daily limit reached"
                : lifetimeLimit == null
                  ? `${dailyRemaining} download${dailyRemaining !== 1 ? "s" : ""} available today`
                  : `${dailyRemaining} download${dailyRemaining !== 1 ? "s" : ""} left today · ${lifetimeRemaining ?? 0} lifetime left`}
          </p>
          <p style={{
          margin: 0,
          fontSize: 12,
          color: "#9ca3af"
        }}>
            {isLifetimeLimitReached
              ? `You've used all ${lifetimeLimit ?? lifetimeUsed} free worksheets — upgrade for more`
              : isDailyLimitReached
                ? "Come back tomorrow — daily limit resets at midnight"
                : lifetimeLimit == null
                  ? `${dailyUsed}/${dailyLimit} used today · Re-downloads do not use quota`
                  : `${dailyUsed}/${dailyLimit} today · ${lifetimeUsed}/${lifetimeLimit} lifetime`}
          </p>
        </div>
      </div>

      {downloadError && <p style={{
      margin: "0 0 14px",
      fontSize: 13,
      color: "hsl(var(--brand-red-600))"
    }}>{downloadError}</p>}

      {/* Search */}
      <div style={{
      position: "relative",
      marginBottom: 14
    }}>
        <span style={{
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        color: "#bbb",
        pointerEvents: "none"
      }}>🔍</span>
        <input type="text" placeholder={t("components.printable_worksheets.search_worksheets")} value={query} onChange={e => {
        setQuery(e.target.value);
        setPage(1);
      }} style={{
        width: "100%",
        padding: "10px 12px 10px 36px",
        borderRadius: 10,
        border: "1.5px solid hsl(var(--border))",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        background: "hsl(var(--card))",
        color: "hsl(var(--foreground))"
      }} />
        {query && <button onClick={() => {
        setQuery("");
        setPage(1);
      }} style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#9ca3af",
        fontSize: 16,
        lineHeight: 1
      }}>✕</button>}
      </div>

      {/* Count */}
      <p style={{
      margin: "0 0 12px",
      fontSize: 12,
      color: "#9ca3af"
    }}>
        {filtered.length} {t("components.printable_worksheets.worksheet")}{filtered.length !== 1 ? "s" : ""}
        {downloadedCount > 0 ? ` · ${downloadedCount} already downloaded` : ""}
      </p>

      {filtered.length === 0 ? <div style={{
      textAlign: "center",
      padding: "36px 20px"
    }}>
          <p style={{
        fontSize: 15,
        color: "#9ca3af",
        margin: 0
      }}>
            {query ? `No results for "${query}"` : "No worksheets available."}
          </p>
        </div> : <>
          {/* Grid — 1 column on mobile, 2 on wider screens */}
          <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
        gap: 12
      }}>
            {paginated.map(ws => (
              <WorksheetCard
                key={ws.id}
                worksheet={ws}
                isLimitReached={isLimitReached}
                isDownloading={downloadingId === ws.id}
                onDownload={() => void handleDownload(ws)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 20
      }}>
              <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} style={{
          ...darkBtn(),
          background: currentPage === 1 ? "#f1f5f9" : "#1e293b",
          color: currentPage === 1 ? "#94a3b8" : "#fff",
          cursor: currentPage === 1 ? "not-allowed" : "pointer"
        }}>{t("components.printable_worksheets.prev")}</button>
              <span style={{
          fontSize: 13,
          color: "#6b7280",
          minWidth: 60,
          textAlign: "center"
        }}>
                {currentPage} / {totalPages}
              </span>
              <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} style={{
          ...darkBtn(),
          background: currentPage === totalPages ? "#f1f5f9" : "#1e293b",
          color: currentPage === totalPages ? "#94a3b8" : "#fff",
          cursor: currentPage === totalPages ? "not-allowed" : "pointer"
        }}>{t("components.printable_worksheets.next")}</button>
            </div>}
        </>}
    </>;
}
function WorksheetCard({
  worksheet,
  isLimitReached,
  isDownloading,
  onDownload
}: {
  worksheet: Worksheet;
  isLimitReached: boolean;
  isDownloading: boolean;
  onDownload: () => void;
}) {
  const {
    t
  } = useTranslation();
  const displayName = worksheet.name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  const isPdf = worksheet.fileType === "pdf";
  const ext = isPdf ? "PDF" : worksheet.mimeType === "image/png" ? "PNG" : "JPG";
  const pdfEmbedUrl = `https://drive.google.com/file/d/${worksheet.id}/preview`;
  return <div
    className="ws-card"
    data-worksheet-id={worksheet.id}
    style={{
    background: "hsl(var(--card))",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    border: "1px solid hsl(var(--border))"
  }}>
      {/* Preview */}
      <div style={{
      height: 140,
      borderRadius: "12px 12px 0 0",
      overflow: "hidden",
      background: "#f1f5f9",
      position: "relative",
      flexShrink: 0
    }}>
        {isPdf ? <iframe src={pdfEmbedUrl} title={displayName} style={{
        width: "100%",
        height: "100%",
        border: "none",
        display: "block"
      }} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" /> : <div style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #f0f4ff 0%, hsl(var(--brand-pink-50)) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
            <img src={amyLogo} alt={t("components.printable_worksheets.amynest_2")} style={{
          width: 60,
          height: 60,
          objectFit: "contain",
          opacity: 0.82
        }} />
          </div>}
        {/* File type badge */}
        <span style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(255,255,255,0.92)",
        color: isPdf ? "hsl(var(--brand-red-600))" : "hsl(var(--brand-blue-600))",
        fontSize: 10,
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: 20,
        letterSpacing: 0.3,
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        pointerEvents: "none"
      }}>
          {ext}
        </span>
      </div>

      {/* Info + button */}
      <div style={{
      padding: "12px 12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      flex: 1
    }}>
        <p style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
        color: "hsl(var(--foreground))",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        flex: 1
      }}>
          {displayName}
        </p>

        {worksheet.downloaded && <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: "hsl(var(--brand-green-600))"
      }}>Downloaded · re-download free</span>}
        <button className="ws-dl-btn" disabled={(isLimitReached && !worksheet.downloaded) || isDownloading} onClick={onDownload} style={{
        width: "100%",
        background: isLimitReached && !worksheet.downloaded ? "#94a3b8" : "#1e293b",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13,
        fontWeight: 600,
        cursor: (isLimitReached && !worksheet.downloaded) || isDownloading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: (isLimitReached && !worksheet.downloaded) || isDownloading ? 0.65 : 1,
        transition: "opacity 0.15s"
      }}>
          {isLimitReached && !worksheet.downloaded ? <>{t("components.printable_worksheets.limit_reached")}</> : isDownloading ? <>Saving…</> : <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
              </svg>
              {worksheet.downloaded ? "Download Again" : t("components.printable_worksheets.download")}
            </>}
        </button>
      </div>
    </div>;
}
function DownloadWalletCard({ wallet }: { wallet: HubDownloadWallet }) {
  return (
    <div style={{
      border: "1px solid rgba(168,85,247,0.22)",
      background: "rgba(168,85,247,0.06)",
      borderRadius: 16,
      padding: 14,
      marginBottom: 14
    }}>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12
      }}>
        <div>
          <p style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 800,
            color: "hsl(var(--foreground))"
          }}>
            Worksheet Downloads
          </p>
          <p style={{
            margin: "4px 0 0",
            fontSize: 12,
            color: "#9ca3af"
          }}>
            Unused downloads are saved automatically.
          </p>
        </div>
        <span style={{
          border: "1px solid hsl(var(--border))",
          borderRadius: 999,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: "nowrap"
        }}>
          Available Today: {wallet.availableToday}
        </span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        marginTop: 12,
        fontSize: 12
      }}>
        <WalletStat label="Daily Refresh" value={`+${wallet.dailyRefresh}`} />
        <WalletStat label="Banked Downloads" value={String(wallet.bankedDownloads)} />
        <WalletStat label="Maximum Bank" value={String(wallet.maxBank)} />
      </div>
      <p style={{
        margin: "10px 0 0",
        fontSize: 12,
        color: "#9ca3af"
      }}>
        Build your download bank up to {wallet.maxBank} worksheets.
      </p>
    </div>
  );
}
function WalletStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      borderRadius: 12,
      background: "rgba(255,255,255,0.55)",
      padding: 8
    }}>
      <p style={{ margin: 0, color: "#9ca3af" }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontWeight: 800 }}>{value}</p>
    </div>
  );
}
function darkBtn(): React.CSSProperties {
  return {
    background: "#1e293b",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "9px 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6
  };
}
function WsSpinner() {
  return <div style={{
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "2.5px solid #e5e7eb",
    borderTopColor: "#1e293b",
    animation: "ws-spin 0.7s linear infinite"
  }}>
      <style>{`@keyframes ws-spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
}