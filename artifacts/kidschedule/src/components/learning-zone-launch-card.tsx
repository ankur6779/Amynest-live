import { AppLink } from "@/components/app-link";
import { LearningZonePremiumCard } from "@/components/learning-zone-premium-card";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import type { LearningZoneCardId } from "@/lib/learning-zone-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { recordTtsUserGesture } from "@/lib/tts-guard";

type LearningZoneLaunchCardProps = {
  cardId: LearningZoneCardId;
  href: string;
  title: string;
  description: string;
  tryFree?: boolean;
  previewBadge?: "Preview Available" | "Explore Free" | "Premium Experience";
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
};

/** Premium Learning Zone launch tile — entire card navigates. */
export function LearningZoneLaunchCard({
  cardId,
  href,
  title,
  description,
  tryFree,
  previewBadge,
  testId,
  sectionId,
  onNavigate,
}: LearningZoneLaunchCardProps) {
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const tileId = sectionId ?? testId.replace(/-launch-card$/, "");

  const warmOnIntent = () => {
    recordTtsUserGesture();
    if (cardId === "phonics") {
      void import("@/lib/app-audio-prefetch").then((m) => m.warmPhonicsOnHubIntent());
    }
  };

  return (
    <div className="h-full">
      <AppLink
        href={href}
        onPointerDown={warmOnIntent}
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
        <LearningZonePremiumCard
          cardId={cardId}
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
