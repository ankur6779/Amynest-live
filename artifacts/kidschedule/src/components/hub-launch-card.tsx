import { AppLink } from "@/components/app-link";
import { TryFreeBadge } from "@/components/try-free-badge";
import { HubShadedCardBody } from "@/components/hub-sub-tile-shell";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import { useParentHubQuietModule } from "@/lib/parent-hub/quiet-module-context";
import { cn } from "@/lib/utils";
import {
  getHubFeatureTileAccent,
  hubShadedSectionCardClasses,
  HUB_FEATURE_TILE_DESC,
  HUB_FEATURE_TILE_ICON,
  HUB_FEATURE_TILE_LAUNCH_ROW,
  HUB_FEATURE_TILE_TEXT,
  HUB_FEATURE_TILE_TITLE,
  HUB_TILE_TRIGGER,
} from "@/lib/parent-hub-premium";
import { hubTileAriaLabel } from "@/components/hub-tile-button";

export function HubLaunchCard({
  href,
  title,
  description,
  icon,
  accentClass,
  cardClass,
  tryFree,
  previewBadge,
  testId,
  sectionId,
  onNavigate,
  onPointerDown,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  cardClass: string;
  tryFree?: boolean;
  previewBadge?: "Preview Available" | "Explore Free" | "Premium Experience";
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
  /** Prefetch / unlock before navigation (instant audio). */
  onPointerDown?: () => void;
}) {
  const discoveryPreview = useInfantDiscoveryPreview();
  const quietRoom = useParentHubQuietModule();
  const awardSectionPoints = useHubSectionPoints();
  const tileId = sectionId ?? testId.replace(/-launch-card$/, "");
  const theme = getHubFeatureTileAccent(tileId);
  const hideShelfBadges = discoveryPreview || quietRoom;

  return (
    <AppLink
      href={href}
      onPointerDown={() => {
        onPointerDown?.();
      }}
      onClick={() => {
        awardSectionPoints(tileId);
        onNavigate?.();
      }}
      className={cn(
        HUB_TILE_TRIGGER,
        "group block h-full overflow-hidden p-0 pl-0 rounded-[24px]",
        hubShadedSectionCardClasses(theme),
        cardClass,
      )}
      aria-label={hubTileAriaLabel(title, description)}
      data-testid={testId}
      data-section-id={sectionId}
      source="hub-launch-card"
    >
      <HubShadedCardBody theme={theme} cardClass={cardClass}>
        <div className={HUB_FEATURE_TILE_LAUNCH_ROW}>
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(HUB_FEATURE_TILE_ICON, theme.emojiShell, accentClass)}>
              {icon}
            </div>
            <div className={HUB_FEATURE_TILE_TEXT}>
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <p className={cn(HUB_FEATURE_TILE_TITLE, "flex-1")}>{title}</p>
                {previewBadge && !hideShelfBadges ? (
                  <span className="shrink-0 rounded-full bg-card/85 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-foreground shadow-sm">
                    {previewBadge}
                  </span>
                ) : null}
                {tryFree && !hideShelfBadges ? <TryFreeBadge /> : null}
              </div>
              <p className={HUB_FEATURE_TILE_DESC}>{description}</p>
            </div>
          </div>
        </div>
      </HubShadedCardBody>
    </AppLink>
  );
}
