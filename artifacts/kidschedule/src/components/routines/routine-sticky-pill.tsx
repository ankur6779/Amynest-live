import { Calendar, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type RoutineStickyPillProps = {
  childName?: string;
  onView: () => void;
  className?: string;
};

export function RoutineStickyPill({ childName, onView, className }: RoutineStickyPillProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onView}
      className={cn(
        "fixed z-30 left-4 right-4 mx-auto max-w-lg",
        "bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
        "flex items-center justify-between gap-3 rounded-full px-4 py-3",
        "bg-[rgba(18,28,60,0.92)] backdrop-blur-[18px]",
        "border border-[rgba(255,184,0,0.45)]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_20px_rgba(255,184,0,0.12)]",
        "transition-all duration-[220ms] active:scale-[0.98] hover:border-amber-400/60",
        className,
      )}
      data-testid="routines-sticky-pill"
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,184,0,0.15)] border border-amber-400/30">
          <Calendar className="h-4 w-4 text-amber-300" />
        </span>
        <span className="text-left min-w-0">
          <span className="block text-sm font-bold text-foreground leading-tight">
            {t("pages.routines.index.sticky_ready", {
              defaultValue: "Today's routine ready",
            })}
          </span>
          {childName && (
            <span className="block text-[11px] text-muted-foreground truncate">{childName}</span>
          )}
        </span>
      </span>
      <span className="flex items-center gap-0.5 text-xs font-bold text-amber-200/95 shrink-0">
        {t("pages.routines.index.sticky_view", { defaultValue: "View" })}
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
