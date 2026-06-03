import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useParams } from "wouter";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { getDiscoveryWorldDefinition } from "@workspace/discovery-worlds";
import { AppLink, useAppNavigate } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { LockedBlock } from "@/components/locked-block";
import { DiscoveryWorldExperience } from "@/components/discovery-world/discovery-world-experience";
import {
  DiscoveryEmptyState,
  DiscoveryErrorState,
  DiscoveryPageLoading,
} from "@/components/discovery-world/discovery-world-polish";
import { getDiscoveryWorldConfigBySlug } from "@/lib/discovery-world-config";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";

const SLUG_TO_WORLD = {
  vehicles: "vehicle_world",
  nature: "nature_world",
  home: "home_sounds_world",
  instruments: "instrument_world",
} as const;

type Child = { id: number; name: string; age: number };

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

export default function DiscoveryWorldLivePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { back } = useAppNavigate();
  const config = getDiscoveryWorldConfigBySlug(slug);
  const worldId = SLUG_TO_WORLD[slug as keyof typeof SLUG_TO_WORLD];
  const definition = worldId ? getDiscoveryWorldDefinition(worldId) : undefined;
  const gateId = definition?.hubModuleGate ?? "hub_vehicle_world";
  const { locked, onEngage } = useHubModuleGate(gateId);

  const [selectedChildId, setSelectedChildId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });

  const { data: children = [], isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey(), refetchOnWindowFocus: true },
  });

  const childList = (children ?? []) as Child[];
  const activeChild =
    childList.find((c) => c.id === selectedChildId) ?? childList[0] ?? null;

  useEffect(() => {
    if (!activeChild) return;
    setSelectedChildId(activeChild.id);
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(activeChild.id));
  }, [activeChild]);

  usePageBackHandler(() => {
    back("discovery-world-live-back");
    return true;
  }, [back]);

  if (!config || !definition) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <DiscoveryErrorState
          action={
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => back("discovery-world-live-back")}
            >
              Back to Discovery Worlds
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DiscoveryPageLoading />
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <DiscoveryEmptyState variant="noChild" className="max-w-md w-full" />
        <Button asChild className="rounded-full px-6">
          <AppLink href="/children/new">
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Add child
          </AppLink>
        </Button>
      </div>
    );
  }

  return (
    <LockedBlock locked={locked} reason="hub_locked">
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 border-b border-border/60 px-4 py-2">
          <button
            type="button"
            onClick={() => back("discovery-world-live-back")}
            aria-label="Back to Discovery Worlds"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Discovery Worlds
          </button>
        </div>
        <DiscoveryWorldExperience
          config={config}
          childId={activeChild.id}
          onEngage={onEngage}
        />
      </div>
    </LockedBlock>
  );
}
