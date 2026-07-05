import { AppLink } from "@/components/app-link";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import { CREATIVITY_CARD_VISUALS } from "@/lib/creativity-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type CreativityLaunchCardProps = {
  href: string;
  title: string;
  description: string;
  tryFree?: boolean;
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
};

/** Premium launch tile for Curiosity Library (Creativity section). */
export function CreativityLaunchCard({
  href,
  title,
  description,
  tryFree,
  testId,
  sectionId,
  onNavigate,
}: CreativityLaunchCardProps) {
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
          visual={CREATIVITY_CARD_VISUALS["curiosity-library"]}
          title={title}
          description={description}
          tryFree={tryFree}
          showTryFreeBadge={!discoveryPreview}
        />
      </AppLink>
    </div>
  );
}
