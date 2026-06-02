import { AppLink } from "@/components/app-link";
import { getDiscoveryWorldDefinition } from "@workspace/discovery-worlds";
import type { WorldId } from "@workspace/world-engine";
import { loadDiscoveryWorldProgress } from "@/lib/discovery-worlds-progress";
import { loadAnimalWorldProgress } from "@/lib/animal-world-progress";
import { animalProgressToPlatform } from "@/lib/discovery-worlds-progress";
import { cn } from "@/lib/utils";
import { Lock, MapPin, Star } from "lucide-react";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";

type LearningMapProps = {
  childId: number;
  catalogSizes: Partial<Record<WorldId, number>>;
};

function masteryPct(
  progress: ReturnType<typeof loadDiscoveryWorldProgress>,
  catalogSize: number,
): number {
  if (catalogSize <= 0) return 0;
  const heard = Object.values(progress.itemMastery).filter((m) => m.soundsPlayed > 0).length;
  return Math.min(100, Math.round((heard / catalogSize) * 100));
}

function DestinationNode({
  worldId,
  childId,
  catalogSize,
}: {
  worldId: WorldId;
  childId: number;
  catalogSize: number;
}) {
  const world = getDiscoveryWorldDefinition(worldId);
  const { locked } = useHubModuleGate(world?.hubModuleGate ?? "hub_animal_world");
  const progress =
    worldId === "animal_world"
      ? animalProgressToPlatform(loadAnimalWorldProgress(childId))
      : loadDiscoveryWorldProgress(worldId, childId);
  const pct = masteryPct(progress, catalogSize);
  let state: "locked" | "unlocked" | "mastered" = "unlocked";
  if (locked) state = "locked";
  else if (pct >= 80) state = "mastered";

  if (!world) return null;

  const inner = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-[24px] border p-4 transition",
        state === "locked" && "opacity-60 border-white/10",
        state === "unlocked" && "border-primary/25 bg-primary/[0.06] hover:bg-white/[0.06]",
        state === "mastered" && "border-emerald-400/40 bg-emerald-500/10",
      )}
    >
      <span className="text-4xl">{world.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{world.title}</p>
        <p className="text-xs text-muted-foreground">
          {state === "locked"
            ? "Unlock in Parent Hub"
            : state === "mastered"
              ? "Mastered"
              : `${pct}% explored · ${progress.xp} XP`}
        </p>
        {state !== "locked" && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {state === "locked" && <Lock className="h-5 w-5 text-muted-foreground" />}
      {state === "mastered" && <Star className="h-5 w-5 text-emerald-300" />}
      {state === "unlocked" && <MapPin className="h-5 w-5 text-primary" />}
    </div>
  );

  if (state === "locked") return <div aria-disabled>{inner}</div>;
  return (
    <AppLink href={world.routePath} className="block">
      {inner}
    </AppLink>
  );
}

export function LearningMap({ childId, catalogSizes }: LearningMapProps) {
  const worldIds = Object.keys(catalogSizes) as WorldId[];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Learning map
        </h2>
      </div>
      <ul className="space-y-3">
        {worldIds.map((worldId) => (
          <li key={worldId}>
            <DestinationNode
              worldId={worldId}
              childId={childId}
              catalogSize={catalogSizes[worldId] ?? 10}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
