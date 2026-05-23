import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Small "Try Free" pill shown on Parent Hub features that still have
 * lifetime free opens remaining (and the user isn't premium).
 */
export function TryFreeBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full",
        // audit-ok: intentional "free" green accent (brand affordance)
        "bg-muted dark:bg-card text-primary dark:text-muted-foreground ring-1 ring-primary",
        "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        className,
      ].join(" ")}
      data-testid="try-free-badge"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {t("parent_hub.badges.try_free")}
    </span>
  );
}
