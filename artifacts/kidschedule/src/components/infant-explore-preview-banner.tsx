import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Shown when an infant parent opens a future-stage module from Explore What's Next. */
export function InfantExplorePreviewBanner({ className = "" }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div
      className={[
        "rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 to-violet-500/5 px-3 py-2.5",
        className,
      ].join(" ")}
      data-testid="infant-explore-preview-banner"
      role="status"
    >
      <div className="flex items-start gap-2">
        <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <p className="text-[11px] leading-snug text-muted-foreground">
          {t("parent_hub.explore_next.preview_banner")}
        </p>
      </div>
    </div>
  );
}
