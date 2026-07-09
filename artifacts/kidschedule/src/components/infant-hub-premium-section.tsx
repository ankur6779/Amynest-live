import type { CSSProperties, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HubExpandedChildren } from "@/components/hub-expanded-children";
import { HubTileButton, hubTileAriaLabel } from "@/components/hub-tile-button";
import {
  INFANT_HUB_TILE_THEMES,
  infantHubSectionCssVars,
  resolveInfantHubCardId,
  type InfantHubCardId,
} from "@/lib/infant-hub-card-config";
import { HUB_EXPANDED_CONTENT } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type InfantHubPremiumSectionProps = {
  sectionId?: string;
  cardId?: InfantHubCardId;
  icon: ReactNode;
  title: string;
  badge?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

/** Premium collapsible infant hub tile — matches Parent Hub section navigation cards. */
export function InfantHubPremiumSection({
  sectionId,
  cardId: cardIdProp,
  icon,
  title,
  badge,
  open,
  onOpenChange,
  children,
}: InfantHubPremiumSectionProps) {
  const { t } = useTranslation();
  const cardId = resolveInfantHubCardId(sectionId, cardIdProp);
  if (!cardId) return null;

  const theme = INFANT_HUB_TILE_THEMES[cardId];
  const description = t(theme.descriptionKey, theme.defaultDescription);
  const panelId = sectionId ? `${sectionId}-panel` : undefined;
  const triggerId = sectionId ? `${sectionId}-trigger` : undefined;
  const pillLabel = badge?.trim() || t("parent_hub.section_groups.open_section");

  const toggle = () => onOpenChange(!open);

  const header = (
    <HubTileButton
      id={triggerId}
      onClick={toggle}
      ariaLabel={hubTileAriaLabel(title, description, open)}
      ariaExpanded={open}
      ariaControls={panelId}
      className="w-full rounded-[18px]"
      testId={sectionId ? `infant-tile-${cardId}` : undefined}
    >
      <div
        className="hub-section-card group relative w-full max-w-full overflow-hidden rounded-[18px]"
        data-expanded={open || undefined}
        data-hub-section={`infant-${cardId}`}
        style={infantHubSectionCssVars(theme.tintRgb) as CSSProperties}
      >
        <div
          className={cn(
            "hub-section-shell relative flex min-h-[4.5rem] items-center overflow-hidden",
            open && "hub-section-shell--expanded",
          )}
        >
          <div
            aria-hidden
            className="hub-section-ambient pointer-events-none absolute inset-0 rounded-[18px]"
            style={{ background: theme.ambientGlow }}
          />
          <span
            aria-hidden={open}
            className="hub-section-watermark hub-section-collapsed-only pointer-events-none absolute select-none leading-none"
          >
            {theme.watermark}
          </span>
          <div aria-hidden className="hub-section-accent-bar absolute left-0 top-2 bottom-2 rounded-full" />
          <div className="hub-section-content">
            <div className="hub-section-icon-shell shrink-0 rounded-xl text-white [&>svg]:h-5 [&>svg]:w-5">
              {icon}
            </div>
            <div className="hub-section-copy">
              <p className="hub-section-title">{title}</p>
              {description ? (
                <p className="hub-section-subtitle hub-section-collapsed-only">{description}</p>
              ) : null}
            </div>
            <span
              aria-hidden={open}
              className={cn(
                "hub-section-open-pill hub-section-collapsed-only shrink-0 rounded-full",
                badge && "hub-section-open-pill--highlight",
              )}
            >
              <span className="hub-section-open-label">{pillLabel}</span>
              <ChevronDown className="hub-section-open-chevron shrink-0" strokeWidth={2.25} aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </HubTileButton>
  );

  const body = (
    <>
      {header}
      <HubExpandedChildren
        open={open}
        connected
        panelId={panelId}
        className={cn(
          HUB_EXPANDED_CONTENT,
          "rounded-b-[18px] border border-white/[0.08] border-t-0 bg-[rgba(10,12,26,0.92)] backdrop-blur-md",
        )}
      >
        {children}
      </HubExpandedChildren>
    </>
  );

  if (!sectionId) {
    return (
      <div className={cn("hub-group-panel", open && "hub-group-panel--open")}>
        {body}
      </div>
    );
  }

  return (
    <section id={sectionId} className="scroll-mt-24">
      <div className={cn("hub-group-panel", open && "hub-group-panel--open")}>
        {body}
      </div>
    </section>
  );
}
