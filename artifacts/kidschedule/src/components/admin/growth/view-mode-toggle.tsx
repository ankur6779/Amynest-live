import { cn } from "@/lib/utils";
import type { DashboardViewMode } from "./types";

const MODES: Array<{ id: DashboardViewMode; label: string }> = [
  { id: "full", label: "Full" },
  { id: "ceo", label: "CEO Mode" },
  { id: "cto", label: "CTO Mode" },
];

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: DashboardViewMode;
  onChange: (mode: DashboardViewMode) => void;
}) {
  return (
    <div className="flex rounded-xl border border-white/10 overflow-hidden">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn(
            "px-3 py-1.5 text-[11px] font-bold transition-colors",
            mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
