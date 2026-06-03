import { useEffect, useMemo, useState } from "react";
import {
  buildDailyAdventure,
  dailyAdventureCompletionPct,
  loadDailyAdventureProgress,
  recordDailyAdventureEvent,
  type DailyAdventureProgress,
  type DailyAdventureTaskKind,
} from "@workspace/world-engine";
import { Progress } from "@/components/ui/progress";
import { PremiumCard } from "@/components/learning-progress/premium-polish";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { dailyAdventureStorageKey } from "@/lib/discovery-worlds-stats";
import type { WorldId } from "@workspace/world-engine";
import { grantDiscoveryWorldXp } from "@/lib/discovery-worlds-progress";
import { trackDiscoveryWorldsEvent } from "@/lib/discovery-worlds-telemetry";
import { DelightBurst } from "./delight-burst";

function readDaily(worldId: WorldId, childId: number): DailyAdventureProgress | null {
  try {
    const raw = localStorage.getItem(dailyAdventureStorageKey(worldId, childId));
    return raw ? (JSON.parse(raw) as DailyAdventureProgress) : null;
  } catch {
    return null;
  }
}

function writeDaily(worldId: WorldId, childId: number, progress: DailyAdventureProgress): void {
  try {
    localStorage.setItem(dailyAdventureStorageKey(worldId, childId), JSON.stringify(progress));
  } catch {
    /* quota */
  }
}

function loadDailyProgress(
  config: DiscoveryWorldRuntimeConfig,
  childId: number,
): DailyAdventureProgress {
  return loadDailyAdventureProgress(
    readDaily(config.worldId, childId),
    config.worldId,
    childId,
    config.manifest.items,
  );
}

export function useDiscoveryDailyAdventure(config: DiscoveryWorldRuntimeConfig, childId: number) {
  const [progress, setProgress] = useState(() => loadDailyProgress(config, childId));
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    setProgress(loadDailyProgress(config, childId));
    setCelebrate(false);
  }, [config.worldId, childId, config.manifest.items]);

  const record = (kind: DailyAdventureTaskKind, amount = 1) => {
    const current = loadDailyProgress(config, childId);
    const result = recordDailyAdventureEvent(current, kind, amount);
    setProgress(result.progress);
    writeDaily(config.worldId, childId, result.progress);
    if (result.allComplete) {
      grantDiscoveryWorldXp(config.worldId, childId, "discoverySession");
      setCelebrate(true);
      trackDiscoveryWorldsEvent(config.worldId, "world_daily_adventure_complete", { childId });
    }
  };

  const pct = dailyAdventureCompletionPct(progress);
  return { progress, pct, record, celebrate, clearCelebrate: () => setCelebrate(false) };
}

export type DiscoveryDailyAdventureState = ReturnType<typeof useDiscoveryDailyAdventure>;

type DiscoveryDailyAdventureCardProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  compact?: boolean;
  daily: DiscoveryDailyAdventureState;
};

export function DiscoveryDailyAdventureCard({
  config,
  childId,
  compact,
  daily,
}: DiscoveryDailyAdventureCardProps) {
  const { progress, pct, celebrate, clearCelebrate } = daily;

  const rows = useMemo(
    () =>
      progress.tasks.map((task) => ({
        task,
        done: progress.completed[task.id] ?? 0,
      })),
    [progress],
  );

  return (
    <PremiumCard tier="premium" className={compact ? "p-3" : "p-4"}>
      <DelightBurst active={celebrate} variant="confetti" onDone={clearCelebrate} />
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Daily adventure</p>
      <p className="mt-1 font-semibold text-foreground">{pct}% complete today</p>
      <Progress value={pct} className="mt-2 h-2" />
      {!compact && (
        <ul className="mt-3 space-y-2">
          {rows.map(({ task, done }) => (
            <li key={task.id} className="flex items-center justify-between text-sm">
              <span>
                {task.emoji} {task.label}
              </span>
              <span className="text-muted-foreground">
                {Math.min(done, task.target)}/{task.target}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PremiumCard>
  );
}

/** Hub-level daily adventure (first live world template). */
export function HubDailyAdventureTeaser({ childId }: { childId: number }) {
  const progress = buildDailyAdventure("vehicle_world", childId, [], new Date().toISOString().slice(0, 10));
  const pct = dailyAdventureCompletionPct(progress);
  return (
    <PremiumCard tier="glow" className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Today&apos;s adventure</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Open any Discovery World to earn stars, stickers, and XP.
      </p>
      <Progress value={pct} className="mt-2 h-2" />
    </PremiumCard>
  );
}
