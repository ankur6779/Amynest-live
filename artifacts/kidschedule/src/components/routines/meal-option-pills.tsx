import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

type MealOptionPillsProps = {
  pills: string[];
  onSelect?: (meal: string) => void;
  compact?: boolean;
  className?: string;
};

export function MealOptionPills({
  pills,
  onSelect,
  compact = false,
  className,
}: MealOptionPillsProps) {
  if (pills.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {pills.map((pill) =>
        onSelect ? (
          <button
            key={pill}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(pill);
            }}
            className={cn(
              "inline-flex items-center gap-1 font-semibold rounded-full border transition-colors",
              "bg-amber-500/10 text-amber-200 border-amber-500/25 hover:bg-amber-500/15",
              compact ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
            )}
          >
            <ChefHat className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
            {pill}
          </button>
        ) : (
          <span
            key={pill}
            className={cn(
              "inline-flex items-center gap-1 font-semibold rounded-full border",
              "bg-amber-500/10 text-amber-200 border-amber-500/25",
              compact ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
            )}
          >
            <ChefHat className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
            {pill}
          </span>
        ),
      )}
    </div>
  );
}
