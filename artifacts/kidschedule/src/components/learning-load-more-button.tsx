import { Sparkles, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  useLearningLoadMore,
  type LearningLoadMoreSection,
} from "@/hooks/use-learning-load-more";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { prefetchLoadMoreAudio } from "@/lib/learning-load-more-audio";

interface LearningLoadMoreButtonProps {
  section: LearningLoadMoreSection;
  childId?: number;
  count?: number;
  excludeIds?: string[];
  params?: Record<string, unknown>;
  onLoaded: (items: {
    questions?: unknown[];
    words?: unknown[];
    tasks?: unknown[];
    tricks?: unknown[];
  }) => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
}

export function LearningLoadMoreButton({
  section,
  childId,
  count = 10,
  excludeIds = [],
  params = {},
  onLoaded,
  className,
  variant = "outline",
  size = "sm",
  disabled = false,
}: LearningLoadMoreButtonProps) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { usage, loading, loadMore } = useLearningLoadMore(section);

  const handleClick = async () => {
    const result = await loadMore({ childId, count, excludeIds, params });
    if (result?.items) {
      onLoaded(result.items);
      // Safe pattern: warm TTS only for items the user just loaded (max 8 texts).
      prefetchLoadMoreAudio(authFetch, section, result.items);
    }
  };

  const atLimit = usage !== null && usage.remaining <= 0;

  const limitHint =
    usage && !usage.isPremium && atLimit
      ? t("components.learning_load_more.upgrade_hint")
      : usage?.isPremium && atLimit
        ? t("components.learning_load_more.daily_limit")
        : null;

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || loading}
        onClick={() => void handleClick()}
        className="gap-1.5 w-full sm:w-auto"
        data-testid={`learning-load-more-${section}`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {t("components.learning_load_more.button")}
        {usage && usage.remaining > 0 && (
          <span className="text-[10px] opacity-80 ml-1">
            ({usage.remaining}
            {usage.isPremium
              ? t("components.learning_load_more.today")
              : t("components.learning_load_more.free_left")}
            )
          </span>
        )}
      </Button>
      {limitHint && (
        <p className="text-[10px] text-muted-foreground mt-1 text-center">{limitHint}</p>
      )}
    </div>
  );
}
