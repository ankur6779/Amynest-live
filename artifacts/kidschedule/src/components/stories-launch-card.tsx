import { AppLink } from "@/components/app-link";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import {
  STORIES_CARD_BADGES,
  STORIES_CARD_VISUALS,
  type StoriesLaunchCardId,
} from "@/lib/stories-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type StoriesLaunchCardProps = {
  cardId: StoriesLaunchCardId;
  href: string;
  title: string;
  description: string;
  tryFree?: boolean;
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
};

/** Premium launch tile for Stories & Communication routes. */
export function StoriesLaunchCard({
  cardId,
  href,
  title,
  description,
  tryFree,
  testId,
  sectionId,
  onNavigate,
}: StoriesLaunchCardProps) {
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const tileId = sectionId ?? testId.replace(/-launch-card$/, "");

  return (
    <div className="w-full">
      <AppLink
        href={href}
        onClick={() => {
          awardSectionPoints(tileId);
          onNavigate?.();
        }}
        className={cn(HUB_TILE_TRIGGER, "block w-full overflow-visible p-0 rounded-[30px]")}
        aria-label={hubTileAriaLabel(title, description)}
        data-testid={testId}
        data-section-id={sectionId}
        source="hub-launch-card"
      >
        <HubPremiumFeatureCard
          visual={STORIES_CARD_VISUALS[cardId]}
          title={title}
          description={description}
          previewBadge={STORIES_CARD_BADGES[cardId]}
          tryFree={tryFree}
          showTryFreeBadge={!discoveryPreview}
        />
      </AppLink>
    </div>
  );
}
