import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { GrowthTimePreset } from "./types";
import { TIME_PRESETS } from "./types";

type Props = {
  preset: GrowthTimePreset;
  customStart: string;
  customEnd: string;
  onPresetChange: (preset: GrowthTimePreset) => void;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  onApply: () => void;
};

export function TimeFilter({
  preset,
  customStart,
  customEnd,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
  onApply,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap rounded-xl border border-white/10 overflow-hidden">
        {TIME_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
            className={cn(
              "px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
              preset === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1"
          />
        </div>
      )}
      <Button variant="outline" size="sm" className="text-xs" onClick={onApply}>
        Apply
      </Button>
    </div>
  );
}
