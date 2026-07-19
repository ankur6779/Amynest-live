import { motion } from "framer-motion";
import type { LevelId, StoryWorld } from "@workspace/abacus";
import { STORY_WORLDS, isWorldUnlocked } from "@workspace/abacus";
import { cn } from "@/lib/utils";

export function AbacusStoryWorldsStrip({
  highestUnlocked,
  reducedMotion,
}: {
  highestUnlocked: LevelId;
  reducedMotion?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-3 space-y-2"
      data-testid="abacus-story-worlds"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Story Worlds
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {STORY_WORLDS.map((world, i) => (
          <StoryWorldChip
            key={world.id}
            world={world}
            unlocked={isWorldUnlocked(world.id, highestUnlocked)}
            delay={i}
            reducedMotion={reducedMotion}
          />
        ))}
      </ul>
    </div>
  );
}

function StoryWorldChip({
  world,
  unlocked,
  delay,
  reducedMotion,
}: {
  world: StoryWorld;
  unlocked: boolean;
  delay: number;
  reducedMotion?: boolean;
}) {
  return (
    <motion.li
      initial={reducedMotion ? false : { y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: reducedMotion ? 0 : delay * 0.05 }}
      className={cn(
        "shrink-0 w-[100px] rounded-xl border px-2 py-2 bg-gradient-to-br min-h-[88px]",
        world.gradient,
        unlocked ? "border-border" : "border-border opacity-45 grayscale",
      )}
      data-testid={`abacus-world-${world.id}`}
    >
      <span className="text-xl block" aria-hidden>
        {unlocked ? world.emoji : "🔒"}
      </span>
      <p className="text-[10px] font-black leading-tight mt-1">{world.title}</p>
      <p className="text-[9px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
        {unlocked ? world.blurb : `Unlock at Level ${world.unlockLevel}`}
      </p>
    </motion.li>
  );
}
