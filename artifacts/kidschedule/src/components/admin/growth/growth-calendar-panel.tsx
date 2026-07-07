import { useMemo, useState } from "react";
import type { GrowthCalendarEvent } from "./gos-types";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "all",
  "deployment",
  "campaign",
  "release",
  "subscription",
  "traffic",
  "crash",
  "revenue",
] as const;

const CAT_COLORS: Record<string, string> = {
  deployment: "border-blue-500/40",
  campaign: "border-pink-500/40",
  release: "border-violet-500/40",
  subscription: "border-emerald-500/40",
  traffic: "border-cyan-500/40",
  crash: "border-rose-500/40",
  revenue: "border-amber-500/40",
};

export function GrowthCalendarPanel({ events }: { events: GrowthCalendarEvent[] }) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.category === filter)),
    [events, filter],
  );

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No calendar events in this window.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap print:hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={cn(
              "text-[10px] rounded-full px-2 py-0.5 border capitalize",
              filter === c ? "border-primary/50 bg-primary/10" : "border-white/10 text-muted-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <ol className="space-y-2 max-h-[480px] overflow-y-auto">
        {filtered.map((e) => (
          <li
            key={e.id}
            className={cn("rounded-lg border-l-2 pl-3 py-2 pr-2 bg-white/[0.02]", CAT_COLORS[e.category] ?? "border-white/20")}
          >
            <div className="flex justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="uppercase tracking-wider">{e.category}</span>
              <time>{new Date(e.timestamp).toLocaleString()}</time>
            </div>
            <p className="text-sm font-medium mt-0.5">{e.title}</p>
            <p className="text-xs text-muted-foreground">{e.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
