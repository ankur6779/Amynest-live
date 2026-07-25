/**
 * Segment tabs — frozen order Sky · Astronomy · Tradition · Reflect (Pack 4 §5).
 * IM-3: all four segments enabled.
 */

import type { DashboardSegmentId } from "../../state/dashboard-session";
import { cn } from "@/lib/utils";

const TABS: {
  id: DashboardSegmentId;
  label: string;
}[] = [
  { id: "sky", label: "Sky" },
  { id: "astronomy", label: "Astronomy" },
  { id: "tradition", label: "Tradition" },
  { id: "reflect", label: "Reflect" },
];

type Props = {
  active: DashboardSegmentId;
  onChange: (id: DashboardSegmentId) => void;
};

export function BirthSkySegmentNav({ active, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Birth Sky sections"
      className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-1"
      data-testid="birth-sky-segment-nav"
      onKeyDown={(e) => {
        const idx = TABS.findIndex((t) => t.id === active);
        if (idx < 0) return;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(TABS[(idx + 1) % TABS.length]!.id);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(TABS[(idx - 1 + TABS.length) % TABS.length]!.id);
        } else if (e.key === "Home") {
          e.preventDefault();
          onChange(TABS[0]!.id);
        } else if (e.key === "End") {
          e.preventDefault();
          onChange(TABS[TABS.length - 1]!.id);
        }
      }}
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "min-h-11 flex-1 rounded-lg px-2 text-xs font-bold tracking-wide",
              selected
                ? "bg-white/12 text-[hsl(40_20%_96%)]"
                : "text-[hsl(40_20%_96%/0.55)]",
            )}
            onClick={() => onChange(tab.id)}
            data-testid={`birth-sky-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
