import { AppLink } from "@/components/app-link";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import { HEALTH_ZONE_CARD_VISUALS } from "@/lib/health-zone-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type HealthZoneLaunchCardProps = {
  href: string;
  title: string;
  description: string;
  tryFree?: boolean;
  previewBadge?: "Preview Available" | "Explore Free" | "Premium Experience";
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
};

/** Premium Health Zone launch tile — entire card navigates. */
export function HealthZoneLaunchCard({
  href,
  title,
  description,
  tryFree,
  previewBadge,
  testId,
  sectionId,
  onNavigate,
}: HealthZoneLaunchCardProps) {
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const tileId = sectionId ?? testId.replace(/-launch-card$/, "");

  return (
    <div className="h-full">
      <AppLink
        href={href}
        onClick={() => {
          awardSectionPoints(tileId);
          onNavigate?.();
        }}
        className={cn(HUB_TILE_TRIGGER, "block h-full overflow-visible p-0 rounded-[30px]")}
        aria-label={hubTileAriaLabel(title, description)}
        data-testid={testId}
        data-section-id={sectionId}
        source="hub-launch-card"
      >
        <HubPremiumFeatureCard
          visual={HEALTH_ZONE_CARD_VISUALS["health-lab"]}
          title={title}
          description={description}
          previewBadge={discoveryPreview ? undefined : previewBadge}
          tryFree={tryFree}
          showTryFreeBadge={!discoveryPreview}
        />
      </AppLink>
    </div>
  );
}
