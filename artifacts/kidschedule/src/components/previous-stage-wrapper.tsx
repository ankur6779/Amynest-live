import { History } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Wraps a HubSection in the "Previous Stage Features" section with a muted
 * pill badge. Content stays fully interactive — same tiles as infant stage.
 */
export function PreviousStageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative group/previous-stage">
      <div className="absolute -top-2.5 left-3 z-10 flex items-center gap-1.5 rounded-full bg-card border border-muted-foreground/25 px-2.5 py-0.5 shadow-sm">
        <History className="h-2.5 w-2.5 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("parent_hub.badges.infant_stage_pill")}
        </span>
      </div>

      <div
        className={[
          "rounded-2xl transition-all duration-300",
          "ring-1 ring-muted-foreground/20",
          "shadow-[0_2px_18px_-10px_rgba(100,116,139,0.20)]",
          "hover:ring-muted-foreground/35 hover:shadow-[0_4px_24px_-8px_rgba(100,116,139,0.28)]",
          "opacity-[0.97] hover:opacity-100",
        ].join(" ")}
        title={t("parent_hub.badges.infant_stage_tooltip")}
      >
        {children}
      </div>
    </div>
  );
}
