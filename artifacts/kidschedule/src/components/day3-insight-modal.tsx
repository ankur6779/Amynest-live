import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { Day3InsightLines } from "@/lib/hub-journey-ux";
import { hubJourneyMessageKey } from "@/lib/hub-journey-ux";

export function Day3InsightModal({
  childName,
  insights,
  isInfant = false,
  onContinue,
  onClose,
}: {
  childName: string;
  insights: Day3InsightLines;
  isInfant?: boolean;
  onContinue: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const jk = (base: string) => hubJourneyMessageKey(base, isInfant);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal
      data-testid="day3-insight-modal"
    >
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-to-br from-primary/15 via-violet-500/10 to-card px-6 pt-8 pb-6 text-center">
          <span className="text-5xl" aria-hidden>
            ✨
          </span>
          <h2 className="font-quicksand font-bold text-xl mt-3 text-foreground">
            {t(jk("insight_title"), { name: childName })}
          </h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <ul className="space-y-3 text-sm text-foreground/90 leading-relaxed">
            <li className="flex gap-2">
              <span className="shrink-0">💡</span>
              <span>{insights.activityLine}</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">📈</span>
              <span>{insights.consistencyLine}</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">🎯</span>
              <span>{insights.nextLine}</span>
            </li>
          </ul>

          {insights.stats.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {insights.stats.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <Button
            className="w-full rounded-xl gap-2 h-11 text-base font-bold bg-gradient-to-r from-primary to-violet-600"
            onClick={onContinue}
          >
            <Sparkles className="h-4 w-4" />
            {t(jk("continue_journey_header"), { name: childName })}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
          >
            {t("parent_hub.journey.day3_later")}
          </button>
        </div>
      </div>
    </div>
  );
}
