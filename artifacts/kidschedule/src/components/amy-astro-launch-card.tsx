import { AppLink } from "@/components/app-link";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import { AMY_ASTRO_LAUNCH_VISUAL } from "@/lib/amy-astro-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type AmyAstroLaunchCardProps = {
  href: string;
  title: string;
  description: string;
  tryFree?: boolean;
  previewBadge?: "Preview Available" | "Explore Free" | "Premium Experience";
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
};

/** Premium Amy Astro Intelligence launch tile — astrology-style Amy hero; entire card navigates. */
export function AmyAstroLaunchCard({
  href,
  title,
  description,
  tryFree = true,
  previewBadge = "Explore Free",
  testId,
  sectionId,
  onNavigate,
}: AmyAstroLaunchCardProps) {
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
          visual={AMY_ASTRO_LAUNCH_VISUAL}
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
