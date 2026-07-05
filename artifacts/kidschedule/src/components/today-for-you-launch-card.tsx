import { AppLink } from "@/components/app-link";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import {
  TODAY_FOR_YOU_CARD_BADGES,
  TODAY_FOR_YOU_CARD_VISUALS,
  type TodayForYouLaunchCardId,
} from "@/lib/today-for-you-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type TodayForYouLaunchCardProps = {
  cardId: TodayForYouLaunchCardId;
  href: string;
  title: string;
  description: string;
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
};

/** Premium launch tile for Today For You routes (e.g. routine generator). */
export function TodayForYouLaunchCard({
  cardId,
  href,
  title,
  description,
  testId,
  sectionId,
  onNavigate,
}: TodayForYouLaunchCardProps) {
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
        className={cn(HUB_TILE_TRIGGER, "block h-full overflow-visible p-0 rounded-[32px]")}
        aria-label={hubTileAriaLabel(title, description)}
        data-testid={testId}
        data-section-id={sectionId}
        source="hub-launch-card"
      >
        <HubPremiumFeatureCard
          visual={TODAY_FOR_YOU_CARD_VISUALS[cardId]}
          title={title}
          description={description}
          previewBadge={TODAY_FOR_YOU_CARD_BADGES[cardId]}
          className="rounded-[32px] [&>div]:rounded-[32px]"
        />
      </AppLink>
    </div>
  );
}
