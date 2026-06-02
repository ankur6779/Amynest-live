import { useMemo } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams } from "wouter";
import type { WorldId } from "@workspace/world-engine";
import { getDiscoveryWorldDefinition } from "@workspace/discovery-worlds";
import { getAllVehicles } from "@workspace/vehicle-world";
import { getAllNatureSounds } from "@workspace/nature-sounds-world";
import { getAllHomeSounds } from "@workspace/home-sounds-world";
import { getAllInstruments } from "@workspace/instrument-world";
import { useAppNavigate } from "@/components/app-link";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { trackDiscoveryWorldsEvent } from "@/lib/discovery-worlds-telemetry";

const SLUG_TO_WORLD: Record<string, WorldId> = {
  vehicles: "vehicle_world",
  nature: "nature_world",
  home: "home_sounds_world",
  instruments: "instrument_world",
};

function itemsForSlug(slug: string) {
  switch (slug) {
    case "vehicles":
      return getAllVehicles();
    case "nature":
      return getAllNatureSounds();
    case "home":
      return getAllHomeSounds();
    case "instruments":
      return getAllInstruments();
    default:
      return [];
  }
}

export default function DiscoveryWorldPreviewPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { back } = useAppNavigate();
  const worldId = SLUG_TO_WORLD[slug];
  const definition = worldId ? getDiscoveryWorldDefinition(worldId) : undefined;
  const items = useMemo(() => itemsForSlug(slug), [slug]);

  usePageBackHandler(() => {
    back("discovery-world-preview-back");
    return true;
  }, [back]);

  if (!definition || !worldId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        World not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 px-4 py-3">
        <button
          type="button"
          onClick={() => back("discovery-world-preview-back")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Worlds
        </button>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-5xl">{definition.emoji}</p>
        <h1 className="mt-3 text-2xl font-bold">{definition.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{definition.subtitle}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preview — full experience coming soon
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-3 text-left">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <span className="text-2xl">{item.emoji}</span>
              <p className="mt-1 font-semibold">{item.name}</p>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          onClick={() => trackDiscoveryWorldsEvent(worldId, "world_opened", { preview: true })}
        >
          Notify me when live
        </button>
      </main>
    </div>
  );
}
