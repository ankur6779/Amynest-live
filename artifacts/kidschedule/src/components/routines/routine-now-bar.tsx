import { useTranslation } from "react-i18next";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile sticky "now" bar — always shows the current (or next) activity on
 * today's routine with a one-tap complete action, like a now-playing bar.
 * Desktop relies on the inline timeline, so this is `sm:hidden`.
 */
export function RoutineNowBar({
  kind,
  activity,
  time,
  minsUntil,
  onComplete,
  completing,
}: {
  kind: "now" | "next";
  activity: string;
  time?: string;
  minsUntil?: number;
  onComplete?: () => void;
  completing?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[rgba(9,20,38,0.92)] backdrop-blur-md px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {kind === "now" ? (
              <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
            ) : (
              <Clock className="h-3 w-3 shrink-0 text-foreground/50" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wide text-foreground/55">
              {kind === "now"
                ? t("pages.routines.detail.hero_happening_now", { defaultValue: "Happening now" })
                : minsUntil && minsUntil > 0
                  ? t("pages.routines.detail.nowbar_starts_in", {
                      defaultValue: "Up next · in {{m}}m",
                      m: minsUntil,
                    })
                  : t("pages.routines.detail.hero_up_next", { defaultValue: "Up next" })}
            </span>
          </div>
          <p className="truncate font-quicksand text-sm font-bold text-foreground leading-tight">
            {activity}
            {time && <span className="ml-1.5 text-xs font-medium text-foreground/50">{time}</span>}
          </p>
        </div>

        {kind === "now" && onComplete && (
          <button
            type="button"
            onClick={onComplete}
            disabled={completing}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white",
              "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_4px_16px_rgba(255,146,53,0.35)]",
              "active:scale-[0.96] transition-transform disabled:opacity-60",
            )}
          >
            <Check className="h-4 w-4" />
            {t("pages.routines.detail.nowbar_done", { defaultValue: "Done" })}
          </button>
        )}
      </div>
    </div>
  );
}
