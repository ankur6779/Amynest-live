import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HubTileButton, hubTileAriaLabel } from "@/components/hub-tile-button";
import { CREATIVITY_SECTION_HEADER_VISUAL } from "@/lib/creativity-card-config";
import { motion, useReducedMotion } from "framer-motion";

type CreativityGroupHeaderProps = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
};

/** Premium section header for the Creativity & Activities hub group. */
export function CreativityGroupHeader({ title, isOpen, onToggle }: CreativityGroupHeaderProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <HubTileButton
        onClick={onToggle}
        ariaLabel={hubTileAriaLabel(title, undefined, isOpen)}
        ariaExpanded={isOpen}
        className="rounded-[18px]"
      >
        <HubPremiumFeatureCard
          visual={CREATIVITY_SECTION_HEADER_VISUAL}
          title={title}
          description=""
          expanded={isOpen}
          variant="section"
        />
      </HubTileButton>
    </motion.div>
  );
}
