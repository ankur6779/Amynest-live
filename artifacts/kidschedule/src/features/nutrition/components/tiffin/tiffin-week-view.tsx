import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import type { TiffinDay } from "@/features/nutrition/lib/tiffin-planner";

interface TiffinWeekViewProps {
  days: TiffinDay[];
  className?: string;
  premiumLocked?: boolean;
}

export function TiffinWeekView({ days, className, premiumLocked }: TiffinWeekViewProps) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const locked = premiumLocked ?? !isPremium;

  if (days.length === 0) return null;

  return (
    <div className={cn("relative space-y-3", className)}>
      {locked && (
        <button
          type="button"
          className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] rounded-lg flex items-center justify-center p-4"
          onClick={() => openPaywall("hub_nutrition")}
        >
          <span className="text-sm font-medium text-foreground">
            {t("nutrition_hub.operations.tiffin_premium")}
          </span>
        </button>
      )}
      <div className={cn("space-y-2", locked && "blur-[2px] select-none pointer-events-none")}>
        {days.map((day) => (
          <div
            key={day.dayLabel}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase text-primary shrink-0 w-10">{day.dayLabel}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{day.suggestion}</p>
                {day.note && (
                  <p className="text-xs text-muted-foreground mt-0.5">{day.note}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
