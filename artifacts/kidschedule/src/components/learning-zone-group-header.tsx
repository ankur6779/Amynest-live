import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HubTileButton, hubTileAriaLabel } from "@/components/hub-tile-button";
import { LEARNING_ZONE_SECTION_HEADER_VISUAL } from "@/lib/learning-zone-card-config";
import { motion, useReducedMotion } from "framer-motion";

type LearningZoneGroupHeaderProps = {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
};

/** Premium section header for the Learning Zone hub group. */
export function LearningZoneGroupHeader({
  title,
  subtitle,
  isOpen,
  onToggle,
}: LearningZoneGroupHeaderProps) {
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
          visual={LEARNING_ZONE_SECTION_HEADER_VISUAL}
          title={title}
          description={subtitle ?? ""}
          expanded={isOpen}
          variant="section"
        />
      </HubTileButton>
    </motion.div>
  );
}
