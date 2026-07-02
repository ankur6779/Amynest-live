import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
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
      <button
        type="button"
        onClick={onToggle}
        className="block w-full text-left active:scale-[0.985] transition-transform"
        aria-expanded={isOpen}
      >
        <HubPremiumFeatureCard
          visual={LEARNING_ZONE_SECTION_HEADER_VISUAL}
          title={title}
          description={subtitle ?? ""}
          actionMode="expand"
          expanded={isOpen}
          variant="section"
        />
      </button>
    </motion.div>
  );
}
