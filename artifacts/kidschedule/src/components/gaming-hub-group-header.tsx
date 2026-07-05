import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HubTileButton, hubTileAriaLabel } from "@/components/hub-tile-button";
import { GAMING_HUB_SECTION_HEADER_VISUAL } from "@/lib/gaming-hub-card-config";
import { motion, useReducedMotion } from "framer-motion";

type GamingHubGroupHeaderProps = {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
};

/** Premium section header for the Gaming Hub group. */
export function GamingHubGroupHeader({ title, subtitle, isOpen, onToggle }: GamingHubGroupHeaderProps) {
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
          visual={GAMING_HUB_SECTION_HEADER_VISUAL}
          title={title}
          description={subtitle}
          expanded={isOpen}
          variant="section"
        />
      </HubTileButton>
    </motion.div>
  );
}
