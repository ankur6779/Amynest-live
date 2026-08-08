import { Map, Gem } from "lucide-react";
import type { DailyMission } from "@workspace/abacus";
import { missionProgress } from "@workspace/abacus";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  isGrowLivingV1Enabled,
  livingGrowContinueCta,
  livingGrowMissionEyebrow,
} from "@/lib/grow/living-room";

export function AbacusDailyAdventureCard({
  mission,
  onStart,
  onClaimTreasure,
}: {
  mission: DailyMission;
  onStart: (stepId: string) => void;
  onClaimTreasure: () => void;
}) {
  const prog = missionProgress(mission);
  const next = mission.steps.find((s) => !s.done && s.kind !== "treasure");
  const treasure = mission.steps.find((s) => s.kind === "treasure");
  const living = isGrowLivingV1Enabled();

  return (
    <div
      className={cn(
        "rounded-2xl p-3 space-y-2.5",
        living
          ? "gw-living-deep-panel border border-[rgba(232,212,184,0.28)]"
          : "border-2 border-violet-400/35 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-background",
      )}
      data-testid="abacus-daily-adventure"
      data-gw-living={living ? "1" : undefined}
    >
      <div className="flex items-start gap-2">
        <Map
          className={cn(
            "h-5 w-5 shrink-0 mt-0.5",
            living ? "text-foreground/70" : "text-violet-600",
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              living
                ? "gw-living-deep-eyebrow"
                : "text-violet-700 dark:text-violet-300",
            )}
          >
            {living
              ? `${livingGrowMissionEyebrow()} · ~${mission.estimatedMinutes} min`
              : `Daily Adventure · ~${mission.estimatedMinutes} min`}
          </p>
          <h3 className={cn("text-sm text-foreground", living ? "font-bold" : "font-black")}>
            {mission.title}
          </h3>
        </div>
        <span className="text-xs font-bold tabular-nums text-muted-foreground shrink-0">
          {prog.completed}/{prog.total}
        </span>
      </div>

      <Progress value={prog.pct} className="h-2" />

      <ol className="space-y-1.5">
        {mission.steps.map((step) => {
          const isTreasure = step.kind === "treasure";
          const lockedTreasure = isTreasure && !prog.allCoreDone;
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={step.done || lockedTreasure}
                onClick={() => {
                  if (isTreasure) onClaimTreasure();
                  else onStart(step.id);
                }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left min-h-12 transition-colors",
                  step.done
                    ? "border-emerald-400/40 bg-emerald-500/10 opacity-90"
                    : lockedTreasure
                      ? "border-border bg-muted/40 opacity-60"
                      : living
                        ? "border-[rgba(232,212,184,0.28)] bg-background hover:bg-[rgba(232,212,184,0.08)]"
                        : "border-violet-400/30 bg-background hover:bg-violet-500/10",
                )}
                data-testid={`abacus-mission-step-${step.id}`}
              >
                <span className="text-lg" aria-hidden>
                  {step.done ? "✅" : step.emoji}
                </span>
                <span className="flex-1 text-xs font-bold truncate">{step.title}</span>
                {!step.done && !lockedTreasure && (
                  <span
                    className={cn(
                      "text-[10px] font-bold",
                      living
                        ? "text-muted-foreground"
                        : "text-violet-700 dark:text-violet-300",
                    )}
                  >
                    {isTreasure ? (living ? "Note" : "Claim") : living ? "Start" : "Go"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {next && (
        <button
          type="button"
          onClick={() => onStart(next.id)}
          className={cn(
            "w-full rounded-xl text-sm font-bold py-3 min-h-12",
            living
              ? "gw-living-deep-primary-btn"
              : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white",
          )}
          data-testid="abacus-mission-continue"
        >
          {living
            ? `${livingGrowContinueCta()} · ${next.title}`
            : `Continue quest → ${next.title}`}
        </button>
      )}

      {prog.allCoreDone && treasure && !mission.treasureClaimed && (
        <button
          type="button"
          onClick={onClaimTreasure}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold py-3 min-h-12",
            living
              ? "gw-living-deep-primary-btn"
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
          )}
          data-testid="abacus-mission-treasure"
        >
          <Gem className="h-4 w-4" />
          {living
            ? "A quiet note for today's practice"
            : `Claim +${mission.rewardGems} gems · +${mission.rewardStars} star`}
        </button>
      )}
    </div>
  );
}
