import { cn } from "@/lib/utils";

export function MealPlanDaySelector({
  labels,
  selectedIndex,
  onSelect,
}: {
  labels: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      className="sticky z-20 -mx-4 px-4 py-2 bg-[#0b1730]/95 backdrop-blur-md border-b border-white/[0.06] top-[max(env(safe-area-inset-top,0px),0px)]"
      data-testid="meal-plan-day-selector"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {labels.map((label, i) => (
          <button
            key={`${label}-${i}`}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
              selectedIndex === i
                ? "border-[rgba(255,184,0,0.55)] bg-[rgba(255,184,0,0.14)] text-foreground"
                : "border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]",
            )}
            aria-pressed={selectedIndex === i}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
