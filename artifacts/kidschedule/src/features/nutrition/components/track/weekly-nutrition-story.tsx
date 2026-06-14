import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NUTRITION_WEEKLY_STORY_CARD } from "@/features/nutrition/lib/nutrition-ui-tokens";
import { nutritionFadeUp, nutritionWinReveal } from "@/features/nutrition/lib/nutrition-motion";
import { useNutritionConfidence } from "@/features/nutrition/hooks/use-nutrition-confidence";

export function WeeklyNutritionStory({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { story, confidence } = useNutritionConfidence();

  return (
    <motion.div
      className={cn(NUTRITION_WEEKLY_STORY_CARD, compact ? "p-3" : "p-4 sm:p-5", "space-y-3")}
      variants={nutritionFadeUp}
      initial="initial"
      animate="animate"
    >
      {/* Success accent glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-400/25">
          <Sparkles className="h-4 w-4 text-emerald-300/90" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
            {t("nutrition_hub.intelligence.weekly_story")}
          </p>
          <p className="text-sm text-foreground/85 mt-0.5 leading-relaxed">{confidence.summary}</p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {story.wins.map((win, i) => (
          <motion.li
            key={win}
            className="flex items-start gap-2 text-sm text-foreground"
            variants={nutritionWinReveal}
            initial="initial"
            animate="animate"
            transition={{ delay: i * 0.06 }}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
              ✓
            </span>
            <span>{win}</span>
          </motion.li>
        ))}
      </ul>

      <div className="rounded-xl border border-amber-400/20 bg-gradient-to-r from-amber-500/[0.08] to-emerald-500/[0.06] px-3 py-2.5">
        <p className="text-xs font-semibold text-amber-200/70">
          {t("nutrition_hub.intelligence.focus_next_week")}
        </p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{story.focusLabel}</p>
      </div>
    </motion.div>
  );
}
