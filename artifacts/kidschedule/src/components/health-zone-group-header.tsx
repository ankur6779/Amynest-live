import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HEALTH_ZONE_SECTION_HEADER_VISUAL } from "@/lib/health-zone-card-config";
import { motion, useReducedMotion } from "framer-motion";

type HealthZoneGroupHeaderProps = {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
};

/** Premium section header for the Health Zone hub group. */
export function HealthZoneGroupHeader({ title, subtitle, isOpen, onToggle }: HealthZoneGroupHeaderProps) {
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
          visual={HEALTH_ZONE_SECTION_HEADER_VISUAL}
          title={title}
          description={subtitle}
          actionMode="expand"
          expanded={isOpen}
          showChips={false}
        />
      </button>
    </motion.div>
  );
}
