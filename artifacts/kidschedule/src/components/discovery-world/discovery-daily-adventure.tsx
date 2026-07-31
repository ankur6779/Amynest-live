import { useMemo, useState } from "react";
import {
  dailyAdventureCompletionPct,
  loadDailyAdventureProgress,
  recordDailyAdventureEvent,
  type DailyAdventureProgress,
  type DailyAdventureTaskKind,
} from "@workspace/world-engine";
import { PremiumCard } from "@/components/learning-progress/premium-polish";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { dailyAdventureStorageKey } from "@/lib/discovery-worlds-stats";
import type { WorldId } from "@workspace/world-engine";
import { grantDiscoveryWorldXp } from "@/lib/discovery-worlds-progress";
import { trackDiscoveryWorldsEvent } from "@/lib/discovery-worlds-telemetry";
import {
  getHubDailyAdventureView,
  recordHubDailyAdventure,
} from "@/lib/discovery-worlds-hub-daily";
import { recordAttentionEvent } from "@/lib/sound-world-attention-store";
import {
  AnimatedScore,
  MissionCompleteBanner,
  SpringProgressBar,
  emitXpFly,
} from "./sound-world-motion";

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

export function useDiscoveryDailyAdventure(config: DiscoveryWorldRuntimeConfig, childId: number) {
  const [progress, setProgress] = useState(() =>
    loadDailyAdventureProgress(
      readDaily(config.worldId, childId),
      config.worldId,
      childId,
      config.manifest.items,
    ),
  );
  const [celebrate, setCelebrate] = useState(false);

  const record = (kind: DailyAdventureTaskKind, amount = 1) => {
    const result = recordDailyAdventureEvent(progress, kind, amount);
    setProgress(result.progress);
    writeDaily(config.worldId, childId, result.progress);
    recordHubDailyAdventure(childId, config.worldId, kind, amount);
    if (result.allComplete) {
      grantDiscoveryWorldXp(config.worldId, childId, "discoverySession");
      emitXpFly({ amount: 15 });
      setCelebrate(true);
      recordAttentionEvent(childId, "task_complete", { worldId: config.worldId });
      trackDiscoveryWorldsEvent(config.worldId, "world_daily_adventure_complete", { childId });
      void import("@/lib/learning-events-bridge").then(({ publishDailyMissionCompleted }) => {
        publishDailyMissionCompleted({
          childId,
          module: "discovery_worlds",
          entityId: config.worldId,
          metadata: { worldId: config.worldId },
        });
      });
    }
  };

  const pct = dailyAdventureCompletionPct(progress);
  return { progress, pct, record, celebrate, clearCelebrate: () => setCelebrate(false) };
}

type DiscoveryDailyAdventureCardProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  compact?: boolean;
};

export function DiscoveryDailyAdventureCard({
  config,
  childId,
  compact,
}: DiscoveryDailyAdventureCardProps) {
  const { progress, pct, celebrate, clearCelebrate } = useDiscoveryDailyAdventure(config, childId);

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
      <MissionCompleteBanner
        active={celebrate}
        label="Daily adventure complete!"
        onDone={clearCelebrate}
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Daily adventure</p>
      <p className="mt-1 font-semibold text-foreground">
        <AnimatedScore value={pct} suffix="% complete today" />
      </p>
      <SpringProgressBar value={pct} className="mt-2" />
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

/** Hub-level daily adventure — progress from real cross-world completion. */
export function HubDailyAdventureTeaser({ childId }: { childId: number }) {
  const view = useMemo(() => getHubDailyAdventureView(childId), [childId]);
  const complete = view.total > 0 && view.done >= view.total;
  const subtitle =
    view.total === 0
      ? "Open any sound world to earn stars, stickers, and XP."
      : complete
        ? "Today's adventure complete — great exploring!"
        : `${view.done}/${view.total} tasks · Open any sound world to earn stars, stickers, and XP.`;

  return (
    <PremiumCard tier="glow" className="relative overflow-hidden p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Today&apos;s adventure</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <SpringProgressBar value={view.pct} className="mt-2" />
      {complete && (
        <p className="mt-2 text-xs font-semibold text-amber-200" aria-live="polite">
          ✨ Adventure complete
        </p>
      )}
    </PremiumCard>
  );
}
