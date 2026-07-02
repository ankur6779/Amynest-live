import { AppLink } from "@/components/app-link";
import { LearningZonePremiumCard } from "@/components/learning-zone-premium-card";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import type { LearningZoneCardId } from "@/lib/learning-zone-card-config";
import { useTranslation } from "react-i18next";

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

/** Premium Learning Zone launch tile — same routing/handlers as HubLaunchCard. */
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
  const { t } = useTranslation();
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const tileId = sectionId ?? testId.replace(/-launch-card$/, "");
  const actionLabel = discoveryPreview
    ? t("parent_hub.explore_next.cta_preview")
    : t("parent_hub.explore_next.cta_open");

  return (
    <div className="h-full">
      <AppLink
        href={href}
        onClick={() => {
          awardSectionPoints(tileId);
          onNavigate?.();
        }}
        className="block h-full overflow-visible p-0 active:scale-[0.985]"
        data-testid={testId}
        data-section-id={sectionId}
        source="hub-launch-card"
      >
        <LearningZonePremiumCard
          cardId={cardId}
          title={title}
          description={description}
          actionLabel={actionLabel}
          previewBadge={discoveryPreview ? undefined : previewBadge}
          tryFree={tryFree}
          showTryFreeBadge={!discoveryPreview}
        />
      </AppLink>
    </div>
  );
}
