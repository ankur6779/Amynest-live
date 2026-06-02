import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { DISCOVERY_WORLDS_REGISTRY } from "@workspace/discovery-worlds";
import type { DiscoveryWorldDefinition } from "@workspace/world-engine";
import type { WorldId } from "@workspace/world-engine";
import { AppLink, useAppNavigate } from "@/components/app-link";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { cn } from "@/lib/utils";
import { LearningMap } from "@/components/discovery-world/learning-map";
import { HubDailyAdventureTeaser } from "@/components/discovery-world/discovery-daily-adventure";
import { aggregateDiscoveryStreak } from "@/lib/discovery-worlds-cross-progress";

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

const CATALOG_SIZES: Partial<Record<WorldId, number>> = {
  animal_world: 16,
  vehicle_world: 8,
  nature_world: 6,
  home_sounds_world: 6,
  instrument_world: 6,
};

function DiscoveryWorldLink({ world }: { world: DiscoveryWorldDefinition }) {
  const { locked } = useHubModuleGate(world.hubModuleGate);

  return (
    <li>
      <AppLink
        href={world.routePath}
        className={cn(
          "flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]",
          locked && "pointer-events-none opacity-60",
        )}
      >
        <span className="text-4xl">{world.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{world.title}</p>
          <p className="text-sm text-muted-foreground">{world.subtitle}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase",
            locked && "bg-white/10 text-muted-foreground",
            !locked && world.status === "live" && "bg-emerald-500/15 text-emerald-300",
            !locked && world.status === "preview" && "bg-amber-500/15 text-amber-200",
          )}
        >
          {locked ? "Locked" : world.status === "live" ? "Play" : world.status}
        </span>
      </AppLink>
    </li>
  );
}

export default function DiscoveryWorldsHubPage() {
  const { back } = useAppNavigate();
  const [childId, setChildId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });

  usePageBackHandler(() => {
    back("discovery-worlds-hub-back");
    return true;
  }, [back]);

  useEffect(() => {
    if (childId) return;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) setChildId(saved);
  }, [childId]);

  const streak = childId ? aggregateDiscoveryStreak(childId) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur md:px-6">
        <button
          type="button"
          onClick={() => back("discovery-worlds-hub-back")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Parent Hub
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Discovery Worlds
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Sound learning worlds</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Premium listening adventures with daily goals, stickers, and parent insights.
        </p>

        {streak > 0 && (
          <p className="mt-3 inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-200">
            🔥 {streak} day explorer streak
          </p>
        )}

        {childId && (
          <>
            <div className="mt-6">
              <HubDailyAdventureTeaser childId={childId} />
            </div>
            <div className="mt-8">
              <LearningMap childId={childId} catalogSizes={CATALOG_SIZES} />
            </div>
          </>
        )}

        <ul className="mt-8 space-y-3">
          {DISCOVERY_WORLDS_REGISTRY.map((world) => (
            <DiscoveryWorldLink key={world.worldId} world={world} />
          ))}
        </ul>
      </main>
    </div>
  );
}
