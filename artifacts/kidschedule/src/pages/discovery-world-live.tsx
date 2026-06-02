import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { useParams } from "wouter";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { getDiscoveryWorldDefinition } from "@workspace/discovery-worlds";
import { AppLink, useAppNavigate } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LockedBlock } from "@/components/locked-block";
import { DiscoveryWorldExperience } from "@/components/discovery-world/discovery-world-experience";
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
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        World not found or not live yet.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="font-bold">Add a child to begin</p>
            <Button asChild className="mt-4">
              <AppLink href="/children/new">Add child</AppLink>
            </Button>
          </CardContent>
        </Card>
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
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
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
