import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { computePlatformAchievements } from "@workspace/world-engine";
import { Progress } from "@/components/ui/progress";
import { TRANSITION } from "@/lib/experience-system";
import { loadDiscoveryWorldProgress } from "@/lib/discovery-worlds-progress";
import { openedItemIds } from "@/lib/discovery-worlds-stats";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { cn } from "@/lib/utils";
import { ExperienceProgressStrip } from "./experience-progress-strip";

function achievementRarity(target: number): { label: string; className: string } {
  if (target >= 90) return { label: "Legendary", className: "text-amber-300" };
  if (target >= 20) return { label: "Rare", className: "text-violet-300" };
  return { label: "Common", className: "text-muted-foreground" };
}

type PlatformAchievementsPanelProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
};

export function PlatformAchievementsPanel({ config, childId }: PlatformAchievementsPanelProps) {
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const progress = loadDiscoveryWorldProgress(config.worldId, childId);
  const opened = useMemo(
    () => openedItemIds(config.worldId, childId),
    [config.worldId, childId],
  );

  const rows = useMemo(
    () =>
      computePlatformAchievements(
        config.worldId,
        progress,
        config.manifest.items,
        opened,
      ),
    [config, progress, opened],
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
      <ExperienceProgressStrip config={config} childId={childId} />
      <h2 className="text-lg font-bold text-foreground">Achievement gallery</h2>
      <p className="text-sm text-muted-foreground">
        {progress.achievementsUnlocked.length} stars earned
      </p>

      <div className="space-y-3">
        {rows.map(({ definition, current, unlocked }) => {
          const pct = Math.min(100, Math.round((current / definition.target) * 100));
          const rarity = achievementRarity(definition.target);
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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{definition.title}</p>
                    <span className={cn("text-[10px] font-bold uppercase", rarity.className)}>
                      {rarity.label}
                    </span>
                  </div>
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
              <p className="mt-3 text-xl font-bold">Star earned!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
