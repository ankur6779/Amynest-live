import { AppLink } from "@/components/app-link";
import { LearningZonePremiumCard } from "@/components/learning-zone-premium-card";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import { useParentHubQuietModule } from "@/lib/parent-hub/quiet-module-context";
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
  previewBadge?: "Preview Available" | "Explore Free" | "Premium Experience" | "Premium";
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
};

/** Calm title when Grow living deepen — strip marketplace / unlock SKU language. */
function calmLearningTitle(title: string): string {
  return title
    .replace(/\bPRO\b/gi, "")
    .replace(/\bZone\b/gi, "")
    .replace(/\bMastery\b/gi, "")
    .replace(/\bOlympiad\b/gi, "Challenge")
    .replace(/\bUnlock\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Quiet deepen descriptions — never unlock / explore-free theatre. */
function calmLearningDescription(description: string): string {
  return description
    .replace(/\bUnlock\b[^.!?]*[.!?]?/gi, "")
    .replace(/\bExplore Free\b/gi, "")
    .replace(/\bTry Free\b/gi, "")
    .replace(/\bPremium\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
  const quietRoom = useParentHubQuietModule();
  const awardSectionPoints = useHubSectionPoints();
  const tileId = sectionId ?? testId.replace(/-launch-card$/, "");
  const displayTitle = quietRoom ? calmLearningTitle(title) : title;
  const displayDescription = quietRoom
    ? calmLearningDescription(description)
    : description;
  // Pack 5 / Grow living — no unlock theatre on quiet deepen.
  const effectiveBadge = quietRoom ? undefined : previewBadge;
  const effectiveTryFree = quietRoom ? false : !!tryFree && previewBadge !== "Premium";

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
        aria-label={hubTileAriaLabel(displayTitle, displayDescription)}
        data-testid={testId}
        data-section-id={sectionId}
        data-gw-quiet={quietRoom ? "1" : undefined}
        source="hub-launch-card"
      >
        <LearningZonePremiumCard
          cardId={cardId}
          title={displayTitle}
          description={displayDescription}
          previewBadge={effectiveBadge}
          tryFree={effectiveTryFree}
          showTryFreeBadge={
            !quietRoom &&
            !discoveryPreview &&
            previewBadge !== "Premium" &&
            !!tryFree
          }
        />
      </AppLink>
    </div>
  );
}
