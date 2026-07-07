import { cn } from "@/lib/utils";
import type { TimelineEvent } from "./types";

const SEVERITY_STYLES = {
  critical: "border-rose-500/40 bg-rose-500/10",
  warning: "border-amber-500/40 bg-amber-500/10",
  info: "border-white/10 bg-white/[0.02]",
  positive: "border-emerald-500/40 bg-emerald-500/10",
} as const;

export function ExecutiveTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No notable timeline events in this window.</p>;
  }
  return (
    <div className="relative pl-4 border-l border-white/10 space-y-3">
      {events.map((event, i) => (
        <div key={`${event.timestamp}-${i}`} className={cn("rounded-lg border px-3 py-2", SEVERITY_STYLES[event.severity])}>
          <p className="text-sm font-semibold">{event.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
        </div>
      ))}
    </div>
  );
}
