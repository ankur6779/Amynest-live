import { Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { HubAmyRecommendation } from "./types";

interface AmyRecommendationCardProps {
  recommendation: HubAmyRecommendation;
  onAskAmy: (question: string) => void;
  onNavigate?: () => void;
}

export function AmyRecommendationCard({ recommendation, onAskAmy, onNavigate }: AmyRecommendationCardProps) {
  const { t } = useTranslation();

  return (
    <section
      className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3"
      aria-labelledby="hub-amy-rec-title"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-violet-500" aria-hidden="true" />
        <h3
          id="hub-amy-rec-title"
          className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400"
        >
          {t("parent_hub.executive.amy_recommendation", { defaultValue: "Amy recommends" })}
        </h3>
      </div>
      <button
        type="button"
        onClick={onNavigate}
        className="w-full text-left group"
        aria-label={recommendation.title}
      >
        <p className="text-sm font-medium text-foreground leading-snug group-hover:underline">{recommendation.title}</p>
      </button>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        <span className="font-semibold text-foreground/80">
          {t("parent_hub.executive.why", { defaultValue: "Why:" })}{" "}
        </span>
        {recommendation.why}
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-0 text-violet-600 dark:text-violet-400 hover:bg-transparent hover:underline"
          onClick={() => onAskAmy(recommendation.suggestedQuestion)}
        >
          {t("parent_hub.executive.ask_amy", { defaultValue: "Ask Amy about this" })}
        </Button>
        {onNavigate && (
          <Button type="button" variant="ghost" size="sm" className="h-auto py-1 px-0" onClick={onNavigate}>
            {t("parent_hub.executive.go_there", { defaultValue: "Go there" })}
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </section>
  );
}
