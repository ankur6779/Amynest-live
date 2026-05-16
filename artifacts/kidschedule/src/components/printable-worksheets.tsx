import { useEffect, useRef, useState, useCallback } from "react";
import amyLogo from "@assets/ChatGPT_Image_Apr_19,_2026,_01_56_21_PM_1776587201948.png";
import { useTranslation } from "react-i18next";
import { getApiUrl, resolveApiMediaUrl } from "@/lib/api";
interface Worksheet {
  id: string;
  name: string;
  mimeType: string;
  fileType: "pdf" | "image";
  category: string;
  downloadUrl: string;
  previewUrl: string;
}
const DAILY_LIMIT = 5;
const PAGE_SIZE = 10;
const STORAGE_KEYS = {
  downloaded: "ws_downloaded_ids",
  daily: "ws_daily"
} as const;
interface DailyRecord {
  date: string;
  count: number;
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function getDownloadedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.downloaded);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}
function saveDownloadedId(id: string): void {
  const ids = getDownloadedIds();
  ids.add(id);
  localStorage.setItem(STORAGE_KEYS.downloaded, JSON.stringify([...ids]));
}
function getDailyCount(): DailyRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.daily);
    if (raw) {
      const rec: DailyRecord = JSON.parse(raw);
      if (rec.date === todayStr()) return rec;
    }
  } catch {}
  return {
    date: todayStr(),
    count: 0
  };
}
function incrementDailyCount(): DailyRecord {
  const rec = getDailyCount();
  const next = {
    date: todayStr(),
    count: rec.count + 1
  };
  localStorage.setItem(STORAGE_KEYS.daily, JSON.stringify(next));
  return next;
}
export function PrintableWorksheets({
  childAgeMonths
}: {
  childAgeMonths?: number;
}) {
  const {
    t
  } = useTranslation();
  const [all, setAll] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [dailyRec, setDailyRec] = useState<DailyRecord>({
    date: todayStr(),
    count: 0
  });
  const initRef = useRef(false);
  useEffect(() => {
    setDownloadedIds(getDownloadedIds());
    setDailyRec(getDailyCount());
  }, []);
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
  const handleDownload = useCallback((ws: Worksheet) => {
    if (dailyRec.count >= DAILY_LIMIT) return;
    const link = document.createElement("a");
    link.href = resolveApiMediaUrl(ws.downloadUrl);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = ws.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    saveDownloadedId(ws.id);
    const next = incrementDailyCount();
    setDownloadedIds(getDownloadedIds());
    setDailyRec(next);
  }, [dailyRec]);
  const isLimitReached = dailyRec.count >= DAILY_LIMIT;
  const remaining = Math.max(0, DAILY_LIMIT - dailyRec.count);
  const filtered = all.filter(w => !downloadedIds.has(w.id)).filter(w => !query || w.name.toLowerCase().includes(query.toLowerCase()));
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

      {/* Daily counter badge */}
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
            {isLimitReached ? "Daily limit reached" : `${remaining} download${remaining !== 1 ? "s" : ""} left today`}
          </p>
          <p style={{
          margin: 0,
          fontSize: 12,
          color: "#9ca3af"
        }}>
            {isLimitReached ? "Come back tomorrow — limit resets at midnight" : `${dailyRec.count} of ${DAILY_LIMIT} used · Resets daily`}
          </p>
        </div>
      </div>

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
            {paginated.map(ws => <WorksheetCard key={ws.id} worksheet={ws} isLimitReached={isLimitReached} onDownload={() => handleDownload(ws)} />)}
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
  onDownload
}: {
  worksheet: Worksheet;
  isLimitReached: boolean;
  onDownload: () => void;
}) {
  const {
    t
  } = useTranslation();
  const displayName = worksheet.name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  const isPdf = worksheet.fileType === "pdf";
  const ext = isPdf ? "PDF" : worksheet.mimeType === "image/png" ? "PNG" : "JPG";
  const pdfEmbedUrl = `https://drive.google.com/file/d/${worksheet.id}/preview`;
  return <div className="ws-card" style={{
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

        <button className="ws-dl-btn" disabled={isLimitReached} onClick={onDownload} style={{
        width: "100%",
        background: isLimitReached ? "#94a3b8" : "#1e293b",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13,
        fontWeight: 600,
        cursor: isLimitReached ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: isLimitReached ? 0.65 : 1,
        transition: "opacity 0.15s"
      }}>
          {isLimitReached ? <>{t("components.printable_worksheets.limit_reached")}</> : <>
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