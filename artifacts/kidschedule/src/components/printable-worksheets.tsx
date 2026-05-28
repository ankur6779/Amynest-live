import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import amyLogo from "@assets/ChatGPT_Image_Apr_19,_2026,_01_56_21_PM_1776587201948.png";
import { useTranslation } from "react-i18next";
import { getApiUrl, resolveApiMediaUrl } from "@/lib/api";
import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { downloadPdfFromUrl, hubTodayIst } from "@/lib/hub-pdf-download";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { useRecordLearningActivity } from "@/hooks/use-record-learning-activity";
import {
  pickDailyWorksheets,
  worksheetProgressSummary,
} from "@workspace/learning-progress-engine";
import {
  WorksheetDailyPath,
  WorksheetProgressReport,
} from "@/components/learning-progress";
interface Worksheet {
  id: string;
  name: string;
  mimeType: string;
  fileType: "pdf" | "image";
  category: string;
  downloadUrl: string;
  previewUrl: string;
}
const FREE_DAILY_LIMIT = HUB_CONTENT_QUOTAS.worksheetDaily;
const PREMIUM_DAILY_LIMIT = HUB_CONTENT_QUOTAS.premiumDownloadDaily;
const LIFETIME_LIMIT = HUB_CONTENT_QUOTAS.worksheetLifetime;
const PAGE_SIZE = 10;
const LEGACY_STORAGE_KEYS = {
  downloaded: "ws_downloaded_ids",
  daily: "ws_daily"
} as const;
function storageKeys(userId: string) {
  return {
    downloaded: `ws_downloaded_ids_${userId}`,
    daily: `ws_daily_${userId}`
  } as const;
}
interface DailyRecord {
  date: string;
  count: number;
}
function getDownloadedIds(userId: string | null): Set<string> {
  if (!userId) return new Set();
  try {
    const keys = storageKeys(userId);
    const raw = localStorage.getItem(keys.downloaded);
    if (raw) return new Set(JSON.parse(raw));
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEYS.downloaded);
    return new Set(legacy ? JSON.parse(legacy) : []);
  } catch {
    return new Set();
  }
}
function saveDownloadedId(id: string, userId: string): void {
  const ids = getDownloadedIds(userId);
  ids.add(id);
  localStorage.setItem(storageKeys(userId).downloaded, JSON.stringify([...ids]));
}
function getDailyCount(userId: string | null): DailyRecord {
  const today = hubTodayIst();
  if (!userId) return { date: today, count: 0 };
  try {
    const keys = storageKeys(userId);
    const raw = localStorage.getItem(keys.daily) ?? localStorage.getItem(LEGACY_STORAGE_KEYS.daily);
    if (raw) {
      const rec: DailyRecord = JSON.parse(raw);
      if (rec.date === today) return rec;
    }
  } catch (e) { console.error("REAL ERROR:", e); }
  return {
    date: today,
    count: 0
  };
}
function incrementDailyCount(userId: string): DailyRecord {
  const rec = getDailyCount(userId);
  const next = {
    date: hubTodayIst(),
    count: rec.count + 1
  };
  localStorage.setItem(storageKeys(userId).daily, JSON.stringify(next));
  return next;
}
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
  const { isPremium } = useSubscription();
  const { userId } = useAuth();
  const { unlocks } = useLearningProgress(childId ?? null);
  const { recordActivity } = useRecordLearningActivity(childId ?? null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [all, setAll] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [dailyRec, setDailyRec] = useState<DailyRecord>({
    date: hubTodayIst(),
    count: 0
  });
  const initRef = useRef(false);
  useEffect(() => {
    setDownloadedIds(getDownloadedIds(userId));
    setDailyRec(getDailyCount(userId));
  }, [userId]);
  const loadWorksheets = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(getApiUrl("/api/worksheets")).then(r => {
      if (!r.ok) return r.json().then((b: any) => {
        throw new Error(b.error || `HTTP ${r.status}`);
      });
      return r.json();
    }).then(data => setAll(data.worksheets || [])).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    loadWorksheets();
  }, [loadWorksheets]);
  const handleDownload = useCallback(async (ws: Worksheet) => {
    const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
    if (!isPremium && downloadedIds.size >= LIFETIME_LIMIT) return;
    if (dailyRec.count >= dailyLimit) return;
    if (downloadingId !== null) return;

    setDownloadingId(ws.id);
    setDownloadError(null);
    try {
      const saved = await downloadPdfFromUrl(
        resolveApiMediaUrl(ws.downloadUrl),
        ws.name,
      );
      if (!saved) {
        setDownloadError("Couldn't save the PDF. Please try again.");
        return;
      }
      if (!isPremium && userId) saveDownloadedId(ws.id, userId);
      if (userId) {
        const next = incrementDailyCount(userId);
        if (!isPremium) setDownloadedIds(getDownloadedIds(userId));
        setDailyRec(next);
      }
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
  }, [childId, dailyRec, downloadedIds.size, downloadingId, isPremium, recordActivity, userId]);

  const dailyPicks = useMemo(() => {
    if (!unlocks || all.length === 0 || !childId) return [];
    return pickDailyWorksheets(all, unlocks, { childId, count: 3 });
  }, [all, childId, unlocks]);

  const printableProgress = useMemo(
    () => worksheetProgressSummary([...downloadedIds], all.length),
    [downloadedIds, all.length],
  );
  const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const lifetimeUsed = downloadedIds.size;
  const isDailyLimitReached = dailyRec.count >= dailyLimit;
  const isLifetimeLimitReached = !isPremium && lifetimeUsed >= LIFETIME_LIMIT;
  const isLimitReached = isDailyLimitReached || isLifetimeLimitReached;
  const dailyRemaining = Math.max(0, dailyLimit - dailyRec.count);
  const lifetimeRemaining = Math.max(0, LIFETIME_LIMIT - lifetimeUsed);
  const filtered = all
    .filter(w => isPremium || !downloadedIds.has(w.id))
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
  const allDownloaded = all.length > 0 && all.every(w => downloadedIds.has(w.id));
  return <>
      <style>{`
        @keyframes ws-spin { to { transform: rotate(360deg); } }
        .ws-card { transition: box-shadow 0.18s, transform 0.18s; }
        .ws-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.13) !important; transform: translateY(-1px); }
        .ws-dl-btn:hover:not(:disabled) { opacity: 0.85 !important; }
        .ws-dl-btn:active:not(:disabled) { transform: scale(0.97); }
      `}</style>

      {childId && unlocks && dailyPicks.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <WorksheetDailyPath
            picks={dailyPicks}
            difficulty={unlocks.worksheetDifficulty}
            onSelect={(id) => {
              setHighlightId(id);
              setQuery("");
              setPage(1);
              window.setTimeout(() => {
                document
                  .querySelector(`[data-worksheet-id="${id}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 100);
            }}
          />
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
                : isPremium
                  ? `${dailyRemaining} download${dailyRemaining !== 1 ? "s" : ""} left today (Premium)`
                  : `${dailyRemaining} download${dailyRemaining !== 1 ? "s" : ""} left today · ${lifetimeRemaining} lifetime left`}
          </p>
          <p style={{
          margin: 0,
          fontSize: 12,
          color: "#9ca3af"
        }}>
            {isLifetimeLimitReached
              ? `You've used all ${LIFETIME_LIMIT} free worksheets — upgrade for more`
              : isDailyLimitReached
                ? "Come back tomorrow — daily limit resets at midnight"
                : isPremium
                  ? `${dailyRec.count}/${dailyLimit} used today · Resets daily`
                  : `${dailyRec.count}/${dailyLimit} today · ${lifetimeUsed}/${LIFETIME_LIMIT} lifetime`}
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
        {downloadedIds.size > 0 ? ` · ${downloadedIds.size} already downloaded` : ""}
      </p>

      {/* All downloaded state */}
      {allDownloaded ? <div style={{
      textAlign: "center",
      padding: "36px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12
    }}>
          <img src={amyLogo} alt={t("components.printable_worksheets.amynest")} style={{
        width: 64,
        opacity: 0.7
      }} />
          <p style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#374151",
        margin: 0
      }}>
            {t("components.printable_worksheets.all_worksheets_downloaded")}
          </p>
          <p style={{
        fontSize: 13,
        color: "#9ca3af",
        margin: 0,
        maxWidth: 240,
        lineHeight: 1.5
      }}>
            {t("components.printable_worksheets.you_ve_gone_through_the_whole_collection_new_worksheets_adde")}
          </p>
        </div> : filtered.length === 0 ? <div style={{
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
                highlighted={highlightId === ws.id}
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
  highlighted = false,
  isLimitReached,
  isDownloading,
  onDownload
}: {
  worksheet: Worksheet;
  highlighted?: boolean;
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
    boxShadow: highlighted
      ? "0 0 0 2px hsl(var(--primary)), 0 4px 12px rgba(0,0,0,0.08)"
      : "0 4px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    border: highlighted ? "2px solid hsl(var(--primary))" : "1px solid hsl(var(--border))"
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

        <button className="ws-dl-btn" disabled={isLimitReached || isDownloading} onClick={onDownload} style={{
        width: "100%",
        background: isLimitReached ? "#94a3b8" : "#1e293b",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13,
        fontWeight: 600,
        cursor: isLimitReached || isDownloading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: isLimitReached || isDownloading ? 0.65 : 1,
        transition: "opacity 0.15s"
      }}>
          {isLimitReached ? <>{t("components.printable_worksheets.limit_reached")}</> : isDownloading ? <>Saving…</> : <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
              </svg>
              {t("components.printable_worksheets.download")}
            </>}
        </button>
      </div>
    </div>;
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