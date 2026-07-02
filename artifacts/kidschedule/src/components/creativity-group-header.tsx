import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
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
      <button
        type="button"
        onClick={onToggle}
        className="block w-full text-left active:scale-[0.985] transition-transform"
        aria-expanded={isOpen}
      >
        <HubPremiumFeatureCard
          visual={CREATIVITY_SECTION_HEADER_VISUAL}
          title={title}
          description=""
          actionMode="expand"
          expanded={isOpen}
          variant="section"
        />
      </button>
    </motion.div>
  );
}
