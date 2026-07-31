import { xpProgressToNextLevel, unlockedStreakBadges } from "@workspace/world-engine";
import { loadDiscoveryWorldProgress } from "@/lib/discovery-worlds-progress";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { cn } from "@/lib/utils";
import {
  AnimatedScore,
  ProgressiveStarFill,
  XpWalletTarget,
} from "./sound-world-motion";

type ExperienceProgressStripProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  className?: string;
};

export function ExperienceProgressStrip({
  config,
  childId,
  className,
}: ExperienceProgressStripProps) {
  const progress = loadDiscoveryWorldProgress(config.worldId, childId);
  const level = xpProgressToNextLevel(progress.xp);
  const badges = unlockedStreakBadges(progress.streakDays);

  return (
    <XpWalletTarget
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {level.current.emoji} Level {level.current.level} · {level.current.title}
        </p>
        <ProgressiveStarFill pct={level.pct} className="mt-2" />
        <p className="mt-1 text-[11px] text-muted-foreground">
          <AnimatedScore value={progress.xp} /> XP
          {level.next ? ` · ${level.next.minXp - progress.xp} to ${level.next.title}` : " · Max level"}
        </p>
      </div>
      {progress.streakDays > 0 && (
        <div className="shrink-0 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200">
          🔥 <AnimatedScore value={progress.streakDays} />d
        </div>
      )}
      {badges.length > 0 && (
        <span className="text-lg" title={badges[badges.length - 1]?.title}>
          {badges[badges.length - 1]?.emoji}
        </span>
      )}
    </XpWalletTarget>
  );
}
