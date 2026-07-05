import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HubTileButton, hubTileAriaLabel } from "@/components/hub-tile-button";
import { TODAY_FOR_YOU_SECTION_HEADER_VISUAL } from "@/lib/today-for-you-card-config";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

type TodayForYouGroupHeaderProps = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
};

/** Premium section header for the Today For You hub group. */
export function TodayForYouGroupHeader({
  title,
  isOpen,
  onToggle,
}: TodayForYouGroupHeaderProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const navSubtitle = t("parent_hub.section_groups.collapsed_nav.today");

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <HubTileButton
        onClick={onToggle}
        ariaLabel={hubTileAriaLabel(title, navSubtitle, isOpen)}
        ariaExpanded={isOpen}
        className="rounded-[18px]"
      >
        <HubPremiumFeatureCard
          visual={TODAY_FOR_YOU_SECTION_HEADER_VISUAL}
          title={title}
          description={navSubtitle}
          expanded={isOpen}
          variant="section"
          sectionGroupKey="today"
        />
      </HubTileButton>
    </motion.div>
  );
}
