import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import type { LearningPathSnapshot } from "@workspace/abacus";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function AbacusJourneyMap({
  path,
  onOpenBoss,
  reducedMotion,
}: {
  path: LearningPathSnapshot;
  onOpenBoss?: (level: number) => void;
  reducedMotion?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border-2 border-teal-400/35 bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-background p-3 space-y-2.5"
      data-testid="abacus-journey-map"
    >
      <div className="flex items-start gap-2">
        <Compass className="h-5 w-5 text-teal-700 dark:text-teal-300 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-teal-800 dark:text-teal-200">
            Learning Path · {path.pathPct}% journey
          </p>
          <h3 className="text-sm font-black text-foreground">
            {path.currentChapter.title}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{path.whatLearned}</p>
          <p className="text-[11px] font-semibold text-foreground mt-0.5">{path.whatNext}</p>
        </div>
        <span className="text-[10px] font-bold tabular-nums text-muted-foreground shrink-0 text-right">
          ~{path.estimatedCompletionMinutes}m left
          <br />
          {path.overallMasteryPct}% mastery
        </span>
      </div>

      <Progress value={path.pathPct} className="h-2" />

      <ol
        className="flex gap-1.5 overflow-x-auto pb-1 snap-x"
        aria-label="Curriculum journey"
      >
        {path.nodes.map((node, i) => {
          const clickable =
            node.status === "current" || node.status === "boss_ready" || node.status === "completed";
          return (
            <li key={node.chapter.id} className="snap-start shrink-0">
              <motion.button
                type="button"
                disabled={!clickable || !onOpenBoss}
                onClick={() => onOpenBoss?.(node.chapter.level)}
                initial={reducedMotion ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : i * 0.04 }}
                className={cn(
                  "w-[72px] min-h-[72px] rounded-xl border px-1.5 py-2 text-center transition-colors",
                  node.status === "current" &&
                    "border-teal-500 bg-teal-500/20 ring-2 ring-teal-400/40",
                  node.status === "completed" && "border-emerald-400/50 bg-emerald-500/10",
                  node.status === "boss_ready" && "border-amber-400/50 bg-amber-500/10",
                  node.status === "locked" && "border-border bg-muted/40 opacity-50",
                )}
                data-testid={`abacus-journey-node-${node.chapter.level}`}
                aria-label={`${node.chapter.title}: ${node.status}`}
              >
                <span className="text-lg block" aria-hidden>
                  {node.status === "locked"
                    ? "🔒"
                    : node.status === "completed"
                      ? "✅"
                      : node.status === "boss_ready"
                        ? "⚔️"
                        : "📍"}
                </span>
                <span className="text-[9px] font-bold leading-tight block truncate">
                  L{node.chapter.level}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
