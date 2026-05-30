import { useEffect, useState } from "react";
import { Activity, Trash2 } from "lucide-react";
import {
  clearInfantAnalyticsDebugLog,
  getInfantAnalyticsDebugLog,
  subscribeInfantAnalyticsDebug,
  type InfantAnalyticsDebugEntry,
} from "@/lib/infant-hub-analytics";

export function InfantAnalyticsDebugPanel() {
  const [entries, setEntries] = useState<InfantAnalyticsDebugEntry[]>(() =>
    getInfantAnalyticsDebugLog(),
  );

  useEffect(() => {
    return subscribeInfantAnalyticsDebug((entry) => {
      setEntries((prev) => [entry, ...prev].slice(0, 50));
    });
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-950/40 p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-300">
          <Activity className="h-3 w-3" />
          Infant analytics
        </div>
        <button
          type="button"
          onClick={() => {
            clearInfantAnalyticsDebugLog();
            setEntries([]);
          }}
          className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No infant events yet — open Infant Hub.</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto space-y-1.5">
          {entries.map((entry, i) => (
            <li
              key={`${entry.timestamp}-${entry.event}-${i}`}
              className="rounded border border-white/5 bg-black/20 p-1.5 text-[10px] font-mono"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-violet-300 truncate">{entry.event}</span>
                <span className={entry.success ? "text-emerald-400" : "text-red-400"}>
                  {entry.success ? "ok" : "fail"}
                </span>
              </div>
              <p className="text-muted-foreground truncate">{entry.timestamp}</p>
              <pre className="mt-1 whitespace-pre-wrap break-all text-[9px] text-foreground/80 max-h-16 overflow-y-auto">
                {JSON.stringify(entry.payload, null, 0)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
