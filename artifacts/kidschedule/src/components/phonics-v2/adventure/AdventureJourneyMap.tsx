import { AmyIcon } from "@/components/amy-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ADVENTURE_PATH,
  SATPIN_WORLDS,
  getSatpinWorld,
  worldUnlockStatus,
} from "@/lib/phonics-v3/satpin-worlds";
import type { ReadingAcademyLevelId } from "@/lib/phonics-v3/reading-academy-levels";
import { Lock, Sparkles } from "lucide-react";

type AdventureJourneyMapProps = {
  letterGroupIndex: number;
  academyLevel: ReadingAcademyLevelId;
  childName: string;
  wordsRead: number;
  storiesCompleted: number;
  starsEarned: number;
  practiceDaysThisWeek: number;
  onStartLesson?: () => void;
  className?: string;
};

/**
 * Colorful adventure path — Amy travels with the child.
 * Presentation only; unlocks still follow SATPIN letter groups.
 */
export function AdventureJourneyMap({
  letterGroupIndex,
  academyLevel,
  childName,
  wordsRead,
  storiesCompleted,
  starsEarned,
  practiceDaysThisWeek,
  onStartLesson,
  className,
}: AdventureJourneyMapProps) {
  const world = getSatpinWorld(letterGroupIndex);
  const nextAdventure =
    ADVENTURE_PATH.find((p) => p.id === Math.min(7, academyLevel + 1)) ??
    ADVENTURE_PATH[ADVENTURE_PATH.length - 1]!;

  return (
    <div
      id="phonics-adventure-map"
      data-testid="phonics-adventure-map"
      className={cn(
        "space-y-4 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-emerald-500/[0.06] p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm">
          <AmyIcon size={30} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Reading adventure
          </p>
          <h3 className="font-quicksand text-lg font-black leading-tight">
            {world.emoji} {world.name}
          </h3>
          <p className="text-xs text-muted-foreground">{world.theme}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {world.badge}
        </Badge>
      </div>

      {/* Adventure worlds (sounds → fluent) */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ADVENTURE_PATH.map((step) => {
          const active = step.id === academyLevel;
          const done = step.id < academyLevel;
          return (
            <div
              key={step.id}
              className={cn(
                "flex min-w-[4.5rem] flex-col items-center rounded-2xl px-1.5 py-2 text-center",
                active && "bg-amber-500/20 ring-1 ring-amber-500/40",
                done && !active && "opacity-80",
                !done && !active && "opacity-40",
              )}
              title={step.name}
            >
              <span className="text-lg" aria-hidden>
                {step.emoji}
              </span>
              <span className="text-[8px] font-bold leading-tight">{step.name}</span>
              {active && (
                <span className="mt-0.5 text-[8px] font-black text-amber-700 dark:text-amber-300">
                  Amy is here
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* SATPIN themed islands */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SATPIN_WORLDS.slice(0, 8).map((w) => {
          const status = worldUnlockStatus(letterGroupIndex, w.letterGroupId);
          return (
            <button
              key={w.letterGroupId}
              type="button"
              disabled={status === "locked"}
              onClick={() => {
                if (status === "current") onStartLesson?.();
              }}
              className={cn(
                "relative min-h-[4.5rem] rounded-2xl border-2 bg-gradient-to-br p-2 text-left transition",
                w.gradient,
                status === "current" && "border-amber-500/50 ring-2 ring-amber-400/30",
                status === "completed" && "border-emerald-500/30",
                status === "locked" && "cursor-not-allowed border-dashed border-border/50 opacity-50",
              )}
              data-testid={`satpin-world-${w.letterGroupId}`}
            >
              <span className="text-xl" aria-hidden>
                {w.emoji}
              </span>
              <p className="mt-0.5 font-quicksand text-[11px] font-bold leading-tight">
                {w.name}
              </p>
              {status === "locked" && (
                <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
              )}
              {status === "completed" && (
                <span className="absolute right-1.5 top-1 text-sm" aria-hidden>
                  {w.treasureEmoji}
                </span>
              )}
              {status === "current" && (
                <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-200">
                  <Sparkles className="h-3 w-3" /> Play
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat emoji="⭐" value={String(starsEarned)} label="Stars" />
        <Stat emoji="📖" value={String(wordsRead)} label="Words" />
        <Stat emoji="📚" value={String(storiesCompleted)} label="Stories" />
        <Stat emoji="🔥" value={String(practiceDaysThisWeek)} label="Days" />
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Next for {childName.trim() || "you"}: {nextAdventure.emoji} {nextAdventure.name}
      </p>
    </div>
  );
}

function Stat({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 px-1 py-2">
      <p className="text-sm" aria-hidden>
        {emoji}
      </p>
      <p className="font-quicksand text-sm font-black">{value}</p>
      <p className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
