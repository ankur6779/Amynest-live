import { motion } from "framer-motion";
import { AppLink } from "@/components/app-link";
import { cn } from "@/lib/utils";
import type { UnifiedWorldRow } from "@/lib/discovery-worlds-unified-insights";
import { getDiscoveryWorldDefinition } from "@workspace/discovery-worlds";
import { Trophy, Sticker } from "lucide-react";
import {
  AnimatedScore,
  ProgressiveStarFill,
  useSoundWorldMotion,
} from "./sound-world-motion";

type DiscoveryHubWorldCardProps = {
  row: UnifiedWorldRow;
};

export function DiscoveryHubWorldCard({ row }: DiscoveryHubWorldCardProps) {
  const world = getDiscoveryWorldDefinition(row.worldId);
  const { springGentle, reduced } = useSoundWorldMotion();
  if (!world) return null;

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -2, scale: 1.01 }}
      whileTap={reduced ? undefined : { scale: 0.98, y: 1 }}
      transition={springGentle}
      className="will-change-transform"
    >
      <AppLink
        href={world.routePath}
        className={cn(
          "flex gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]",
          row.mastered && "border-emerald-400/35 bg-emerald-500/10",
        )}
      >
        <span className="text-4xl" aria-hidden>
          {row.emoji}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{row.title}</p>
              <p className="text-xs text-muted-foreground">{world.subtitle}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                row.mastered
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-primary/15 text-primary",
              )}
            >
              {row.mastered ? "Mastered" : "Play"}
            </span>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
              <span>Explored</span>
              <AnimatedScore
                value={row.masteryPct}
                suffix="%"
                className="tabular-nums text-foreground"
              />
            </div>
            <ProgressiveStarFill pct={row.masteryPct} className="mt-1 h-1.5" />
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Sticker className="h-3 w-3" aria-hidden />
              <AnimatedScore value={row.stickers} /> stickers
            </span>
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3 w-3" aria-hidden />
              <AnimatedScore value={row.achievements} /> stars
            </span>
            <span>
              <AnimatedScore value={row.playCount} /> plays · <AnimatedScore value={row.xp} /> XP
            </span>
          </div>
        </div>
      </AppLink>
    </motion.div>
  );
}
