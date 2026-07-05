import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HUB_FEATURE_BADGE } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

/**
 * Small "Try Free" pill shown on Parent Hub features that still have
 * lifetime free opens remaining (and the user isn't premium).
 */
export function TryFreeBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        HUB_FEATURE_BADGE,
        "border-emerald-200/30 bg-[linear-gradient(140deg,rgba(52,211,153,0.26),rgba(52,211,153,0.1))]",
        "text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_8px_16px_-10px_rgba(16,185,129,0.5)]",
        className,
      )}
      data-testid="try-free-badge"
    >
      <Sparkles className="h-2.5 w-2.5 shrink-0" />
      {t("parent_hub.badges.try_free")}
    </span>
  );
}
