import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  computeAchievementProgress,
  getAllAnimals,
} from "@workspace/animal-world";
import { Progress } from "@/components/ui/progress";
import { loadAnimalWorldStats } from "@/lib/animal-world-storage";
import { loadAnimalWorldProgress } from "@/lib/animal-world-progress";
import { ExplorerTierBadge } from "./collection-badge";
import { TRANSITION } from "@/lib/experience-system";

type AchievementsPanelProps = {
  childId: number;
};

export function AchievementsPanel({ childId }: AchievementsPanelProps) {
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const stats = loadAnimalWorldStats(childId);
  const progress = loadAnimalWorldProgress(childId);
  const openedIds = useMemo(() => new Set(Object.keys(stats.playCounts)), [stats.playCounts]);

  const rows = useMemo(
    () => computeAchievementProgress(progress, getAllAnimals(), openedIds),
    [progress, openedIds],
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">Your stars</h2>
        <ExplorerTierBadge tier={progress.explorerTier} />
      </div>
      <p className="text-sm text-muted-foreground">{progress.xp} XP collected</p>

      <div className="space-y-3">
        {rows.map(({ definition, current, unlocked }) => {
          const pct = Math.min(100, Math.round((current / definition.target) * 100));
          return (
            <motion.button
              key={definition.id}
              type="button"
              layout
              onClick={() => unlocked && setCelebrateId(definition.id)}
              className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{definition.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{definition.title}</p>
                  <p className="text-xs text-muted-foreground">{definition.description}</p>
                  <Progress value={pct} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {unlocked ? "Unlocked!" : `${current} / ${definition.target}`}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {celebrateId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            onClick={() => setCelebrateId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={TRANSITION.springGentle}
              className="max-w-sm rounded-[28px] border border-white/10 bg-background p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-5xl">🎉</p>
              <p className="mt-3 text-xl font-bold">Amazing work!</p>
              <button
                type="button"
                className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
                onClick={() => setCelebrateId(null)}
              >
                Keep exploring
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
