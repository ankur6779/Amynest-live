import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LockedBlock } from "@/components/locked-block";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

type HubChild = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

export function HubModulePageShell({
  featureId,
  title,
  subtitle,
  icon,
  filterChild,
  emptyMessage,
  children,
}: {
  featureId: string;
  title: string;
  subtitle?: (child: HubChild, totalAgeMonths: number) => string;
  icon: ReactNode;
  filterChild?: (child: HubChild, totalAgeMonths: number) => boolean;
  emptyMessage?: string;
  children: (ctx: { child: HubChild; totalAgeMonths: number }) => ReactNode;
}) {
  const [, setLocation] = useLocation();
  const { locked, journeySoft, onEngage } = useHubModuleGate(featureId);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });

  const { data: childProfiles = [], isLoading } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchOnWindowFocus: true,
    },
  });

  const childList = (childProfiles ?? []) as HubChild[];
  const eligibleChildren = childList.filter((child) => {
    const totalAgeMonths = child.age * 12 + (child.ageMonths ?? 0);
    return filterChild ? filterChild(child, totalAgeMonths) : true;
  });

  const activeChild =
    eligibleChildren.find((child) => child.id === selectedChildId) ??
    eligibleChildren[0] ??
    null;

  const totalAgeMonths = activeChild
    ? activeChild.age * 12 + (activeChild.ageMonths ?? 0)
    : 0;

  useEffect(() => {
    if (!activeChild) return;
    setSelectedChildId(activeChild.id);
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(activeChild.id));
  }, [activeChild]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation("/parenting-hub");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-3 backdrop-blur safe-area-top">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="inline-flex h-11 min-w-11 items-center gap-2 px-1 text-sm font-bold text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </header>
        <main className="flex flex-1 items-center justify-center p-6 text-center">
          <Card className="max-w-md rounded-3xl border-border bg-card">
            <CardContent className="space-y-4 p-6">
              <UserPlus className="mx-auto h-10 w-10 text-primary" />
              <h1 className="font-quicksand text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {emptyMessage ?? "Add a child profile to get started."}
              </p>
              <Button className="w-full rounded-2xl" onClick={() => setLocation("/children/new")}>
                Add Child
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const headerSubtitle = subtitle?.(activeChild, totalAgeMonths) ?? activeChild.name;

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 px-4 pb-3 pt-[calc(var(--sat,env(safe-area-inset-top,0px))+0.75rem)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="font-quicksand text-xl font-black leading-tight text-foreground">{title}</h1>
            <p className="truncate text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
        </div>
      </header>

      {eligibleChildren.length > 1 && (
        <div className="mx-auto flex w-full max-w-4xl gap-2 overflow-x-auto px-4 pt-3 pb-1">
          {eligibleChildren.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChildId(child.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                activeChild.id === child.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      <main className="scroll-safe min-h-0 flex-1 px-4 py-4">
        <div className="mx-auto max-w-4xl">
          {journeySoft ? (
            <JourneyPreviewContent childName={activeChild.name}>
              <div
                onPointerDownCapture={() => onEngage()}
                onKeyDownCapture={(e) => {
                  if (e.key === "Enter" || e.key === " ") onEngage();
                }}
              >
                {children({ child: activeChild, totalAgeMonths })}
              </div>
            </JourneyPreviewContent>
          ) : (
            <LockedBlock locked={locked} rounded="rounded-2xl">
              <div
                onPointerDownCapture={() => onEngage()}
                onKeyDownCapture={(e) => {
                  if (e.key === "Enter" || e.key === " ") onEngage();
                }}
              >
                {children({ child: activeChild, totalAgeMonths })}
              </div>
            </LockedBlock>
          )}
        </div>
      </main>
    </div>
  );
}
