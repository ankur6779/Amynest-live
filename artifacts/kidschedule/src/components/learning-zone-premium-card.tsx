import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import {
  LEARNING_ZONE_CARD_VISUALS,
  type LearningZoneCardId,
} from "@/lib/learning-zone-card-config";

type LearningZonePremiumCardProps = {
  cardId: LearningZoneCardId;
  title: string;
  description: string;
  actionLabel: string;
  previewBadge?: "Preview Available" | "Explore Free" | "Premium Experience";
  tryFree?: boolean;
  showTryFreeBadge?: boolean;
};

export function LearningZonePremiumCard({
  cardId,
  title,
  description,
  actionLabel,
  previewBadge,
  tryFree,
  showTryFreeBadge = true,
}: LearningZonePremiumCardProps) {
  return (
    <HubPremiumFeatureCard
      visual={LEARNING_ZONE_CARD_VISUALS[cardId]}
      title={title}
      description={description}
      actionLabel={actionLabel}
      previewBadge={previewBadge}
      tryFree={tryFree}
      showTryFreeBadge={showTryFreeBadge}
      actionMode="open"
    />
  );
}
