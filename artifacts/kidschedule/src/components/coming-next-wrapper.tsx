import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgeBand } from "@/lib/age-bands";
import { bandRangeLabel } from "@/lib/age-bands";

/**
 * Wraps a HubSection in Section 2 ("Explore What's Next") with a next-stage pill.
 * Infant parents can browse module UI; server-side guards block mutations.
 */
export function ComingNextWrapper({
  band,
  children,
}: {
  band: AgeBand;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative group/early-access">
      <div className="absolute -top-2.5 left-3 z-10 flex items-center gap-1.5 rounded-full bg-card border border-primary/30 px-2.5 py-0.5 shadow-sm">
        <Sparkles className="h-2.5 w-2.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
          {t("parent_hub.badges.next_stage_pill")}
        </span>
      </div>

      <div
        className={[
          "rounded-2xl transition-all duration-300",
          "ring-1 ring-primary/60",
          "shadow-[0_2px_18px_-10px_rgba(245,158,11,0.35)]",
          "hover:ring-primary hover:shadow-[0_4px_24px_-8px_rgba(245,158,11,0.45)]",
        ].join(" ")}
        title={t("parent_hub.badges.next_stage_tooltip", {
          range: bandRangeLabel(band),
        })}
      >
        {children}
      </div>
    </div>
  );
}
