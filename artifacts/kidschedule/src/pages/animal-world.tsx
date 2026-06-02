import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { AppLink, useAppNavigate } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LockedBlock } from "@/components/locked-block";
import { AnimalWorldExperience } from "@/components/animal-world/animal-world-experience";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";

type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

export default function AnimalWorldPage() {
  const { back } = useAppNavigate();
  const { locked, onEngage } = useHubModuleGate("hub_animal_world");
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
    childList.find((child) => child.id === selectedChildId) ??
    childList[0] ??
    null;

  useEffect(() => {
    if (!activeChild) return;
    setSelectedChildId(activeChild.id);
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(activeChild.id));
  }, [activeChild]);

  usePageBackHandler(() => {
    back("animal-world-back");
    return true;
  }, [back]);

  const goBack = () => back("animal-world-back");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading Animal World...
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm font-bold text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </header>
        <main className="flex flex-1 items-center justify-center p-6 text-center">
          <Card className="max-w-md rounded-3xl border-border bg-card">
            <CardContent className="space-y-4 p-6">
              <p className="text-lg font-bold text-foreground">Add a child to begin</p>
              <p className="text-sm text-muted-foreground">
                Create a child profile to explore animal sounds together.
              </p>
              <Button asChild className="rounded-full">
                <AppLink href="/children/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add child
                </AppLink>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <LockedBlock locked={locked} reason="hub_locked">
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Parent Hub
          </button>
        </div>
        <AnimalWorldExperience childId={activeChild.id} onEngage={onEngage} />
      </div>
    </LockedBlock>
  );
}
