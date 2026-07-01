import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { STORIES_SECTION_HEADER_VISUAL } from "@/lib/stories-card-config";
import { motion, useReducedMotion } from "framer-motion";

type StoriesGroupHeaderProps = {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
};

/** Premium section header for the Stories & Communication hub group. */
export function StoriesGroupHeader({ title, subtitle, isOpen, onToggle }: StoriesGroupHeaderProps) {
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
          visual={STORIES_SECTION_HEADER_VISUAL}
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
