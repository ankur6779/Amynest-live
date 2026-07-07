import type { GrowthOsActionLog } from "./gos-types";

export function ActionHistoryPanel({
  title,
  entries,
}: {
  title: string;
  entries: Pick<GrowthOsActionLog, "at" | "userId" | "action" | "reason" | "outcome">[];
}) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02]">
        <h4 className="text-xs font-semibold font-quicksand">{title}</h4>
      </div>
      <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto">
        {entries.map((e, i) => (
          <li key={`${e.at}-${i}`} className="px-3 py-2 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{e.action.replace(/_/g, " ")}</span>
              <span className="text-muted-foreground shrink-0">{new Date(e.at).toLocaleString()}</span>
            </div>
            {e.reason && <p className="text-muted-foreground mt-0.5">Reason: {e.reason}</p>}
            {e.outcome && <p className="text-muted-foreground mt-0.5">{e.outcome}</p>}
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">By {e.userId.slice(0, 8)}…</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
