import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HubTileButton, hubTileAriaLabel } from "@/components/hub-tile-button";
import { TODAY_FOR_YOU_SECTION_HEADER_VISUAL } from "@/lib/today-for-you-card-config";
import { motion, useReducedMotion } from "framer-motion";

type TodayForYouGroupHeaderProps = {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
};

/** Premium section header for the Today For You hub group. */
export function TodayForYouGroupHeader({
  title,
  subtitle,
  isOpen,
  onToggle,
}: TodayForYouGroupHeaderProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <HubTileButton
        onClick={onToggle}
        ariaLabel={hubTileAriaLabel(title, subtitle, isOpen)}
        ariaExpanded={isOpen}
        className="rounded-[18px]"
      >
        <HubPremiumFeatureCard
          visual={TODAY_FOR_YOU_SECTION_HEADER_VISUAL}
          title={title}
          description={subtitle}
          expanded={isOpen}
          variant="section"
        />
      </HubTileButton>
    </motion.div>
  );
}
