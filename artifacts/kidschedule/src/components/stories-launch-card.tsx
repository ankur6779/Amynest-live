import { AppLink } from "@/components/app-link";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import {
  STORIES_CARD_BADGES,
  STORIES_CARD_VISUALS,
  type StoriesLaunchCardId,
} from "@/lib/stories-card-config";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const reducedMotion = useReducedMotion();
  const tileId = sectionId ?? testId.replace(/-launch-card$/, "");
  const actionLabel = discoveryPreview
    ? t("parent_hub.explore_next.cta_preview")
    : t("parent_hub.explore_next.cta_open");

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
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
        <HubPremiumFeatureCard
          visual={STORIES_CARD_VISUALS[cardId]}
          title={title}
          description={description}
          actionLabel={actionLabel}
          previewBadge={STORIES_CARD_BADGES[cardId]}
          tryFree={tryFree}
          showTryFreeBadge={!discoveryPreview}
          actionMode="open"
        />
      </AppLink>
    </motion.div>
  );
}
