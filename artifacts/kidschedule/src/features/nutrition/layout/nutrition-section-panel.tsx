import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TRANSITION } from "@/lib/experience-system";
import type { NutritionTab } from "@/features/nutrition/types/nutrition-hub.types";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { TodayPage } from "@/features/nutrition/pages/today-page";
import { PlanPage } from "@/features/nutrition/pages/plan-page";
import { TrackPage } from "@/features/nutrition/pages/track-page";
import { LearnPage } from "@/features/nutrition/pages/learn-page";
import { FamilyPage } from "@/features/nutrition/pages/family-page";

const PANELS: Record<NutritionTab, React.ComponentType> = {
  today: TodayPage,
  plan: PlanPage,
  track: TrackPage,
  learn: LearnPage,
  family: FamilyPage,
};

export function NutritionSectionPanel() {
  const { activeTab } = useNutritionContext();
  const reducedMotion = useReducedMotion();
  const Panel = PANELS[activeTab];

  if (reducedMotion) {
    return (
      <div
        role="tabpanel"
        id={`nutrition-panel-${activeTab}`}
        aria-labelledby={`nutrition-tab-${activeTab}`}
        data-testid={`nutrition-panel-${activeTab}`}
      >
        <Panel />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeTab}
        role="tabpanel"
        id={`nutrition-panel-${activeTab}`}
        aria-labelledby={`nutrition-tab-${activeTab}`}
        data-testid={`nutrition-panel-${activeTab}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={TRANSITION.warm}
        className="nutrition-hub-tab-panel"
      >
        <Panel />
      </motion.div>
    </AnimatePresence>
  );
}
