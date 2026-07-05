import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HubTileButton, hubTileAriaLabel } from "@/components/hub-tile-button";
import type { HubSectionPreviewDisplay } from "@/lib/hub-section-discoverability";
import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import { scrollHubGroupIntoView } from "@/lib/hub-section-scroll";
import { CREATIVITY_SECTION_HEADER_VISUAL } from "@/lib/creativity-card-config";
import { GAMING_HUB_SECTION_HEADER_VISUAL } from "@/lib/gaming-hub-card-config";
import { HEALTH_ZONE_SECTION_HEADER_VISUAL } from "@/lib/health-zone-card-config";
import { LEARNING_ZONE_SECTION_HEADER_VISUAL } from "@/lib/learning-zone-card-config";
import { PARENT_SUPPORT_SECTION_HEADER_VISUAL } from "@/lib/parent-support-card-config";
import type { HubGroupKey } from "@/lib/parent-hub-premium";
import { STORIES_SECTION_HEADER_VISUAL } from "@/lib/stories-card-config";
import { TODAY_FOR_YOU_SECTION_HEADER_VISUAL } from "@/lib/today-for-you-card-config";
import { motion, useReducedMotion } from "framer-motion";

const SECTION_VISUALS: Record<HubGroupKey, HubPremiumCardVisual> = {
  today: TODAY_FOR_YOU_SECTION_HEADER_VISUAL,
  learning: LEARNING_ZONE_SECTION_HEADER_VISUAL,
  creativity: CREATIVITY_SECTION_HEADER_VISUAL,
  stories: STORIES_SECTION_HEADER_VISUAL,
  health: HEALTH_ZONE_SECTION_HEADER_VISUAL,
  parent: GAMING_HUB_SECTION_HEADER_VISUAL,
  support: PARENT_SUPPORT_SECTION_HEADER_VISUAL,
};

type HubSectionGroupHeaderProps = {
  groupKey: HubGroupKey;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  preview: HubSectionPreviewDisplay;
};

/** Unified Parent Hub section group header — discoverability + premium shell. */
export function HubSectionGroupHeader({
  groupKey,
  title,
  isOpen,
  onToggle,
  preview,
}: HubSectionGroupHeaderProps) {
  const reducedMotion = useReducedMotion();
  const ariaParts = [preview.subtitle, preview.lastVisitedHint, preview.highlightLabel].filter(Boolean);
  const ariaDescription = ariaParts.join(". ");
  const groupId = `hub-group-${groupKey}`;
  const panelId = `${groupId}-panel`;
  const triggerId = `${groupId}-trigger`;

  const handleToggle = () => {
    const opening = !isOpen;
    onToggle();
    if (opening) {
      scrollHubGroupIntoView(groupId, { reducedMotion: !!reducedMotion });
    }
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <HubTileButton
        id={triggerId}
        onClick={handleToggle}
        ariaLabel={hubTileAriaLabel(title, ariaDescription, isOpen)}
        ariaExpanded={isOpen}
        ariaControls={panelId}
        className="rounded-[18px]"
      >
        <HubPremiumFeatureCard
          visual={SECTION_VISUALS[groupKey]}
          title={title}
          description={preview.subtitle}
          lastVisitedHint={preview.lastVisitedHint}
          highlightLabel={preview.highlightLabel}
          isPrimary={preview.isPrimary}
          expanded={isOpen}
          variant="section"
          sectionGroupKey={groupKey}
        />
      </HubTileButton>
    </motion.div>
  );
}
