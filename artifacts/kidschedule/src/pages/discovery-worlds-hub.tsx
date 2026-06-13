import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Sparkles, UserPlus } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { useAppNavigate } from "@/components/app-link";
import { AddChildLink } from "@/components/add-child-link";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { LearningMap } from "@/components/discovery-world/learning-map";
import { HubDailyAdventureTeaser } from "@/components/discovery-world/discovery-daily-adventure";
import { UnifiedParentDashboard } from "@/components/discovery-world/unified-parent-dashboard";
import { UnifiedParentSummary } from "@/components/discovery-world/unified-parent-summary";
import { DiscoveryHubWorldCard } from "@/components/discovery-world/discovery-hub-world-card";
import { AssetCoverageDashboard } from "@/components/discovery-world/asset-coverage-dashboard";
import {
  DiscoveryEmptyState,
  DiscoveryPageLoading,
} from "@/components/discovery-world/discovery-world-polish";
import { Button } from "@/components/ui/button";
import { aggregateDiscoveryStreak } from "@/lib/discovery-worlds-cross-progress";
import {
  buildUnifiedParentInsights,
  DISCOVERY_CATALOG_SIZES,
} from "@/lib/discovery-worlds-unified-insights";
import { Progress } from "@/components/ui/progress";
import { warmDiscoveryWorldsHubOnOpen } from "@/lib/discovery-worlds-hub-audio-warmup";

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

type Child = { id: number; name: string };

export default function DiscoveryWorldsHubPage() {
  const { back } = useAppNavigate();
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
    childList.find((child) => child.id === selectedChildId) ?? childList[0] ?? null;
  const childId = activeChild?.id ?? null;

  usePageBackHandler(() => {
    back("discovery-worlds-hub-back");
    return true;
  }, [back]);

  useEffect(() => {
    warmDiscoveryWorldsHubOnOpen();
  }, []);

  useEffect(() => {
    if (!activeChild) return;
    setSelectedChildId(activeChild.id);
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(activeChild.id));
  }, [activeChild]);

  const streak = childId ? aggregateDiscoveryStreak(childId) : 0;
  const insights = useMemo(
    () => (childId ? buildUnifiedParentInsights(childId) : null),
    [childId],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DiscoveryPageLoading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur md:px-6">
        <button
          type="button"
          onClick={() => back("discovery-worlds-hub-back")}
          aria-label="Back to Parent Hub"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Parent Hub
        </button>
      </header>

      <main
        id="discovery-worlds-main"
        className="mx-auto max-w-2xl px-4 py-8 md:max-w-3xl md:px-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Amy Sound World
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Sound learning worlds</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          See what your child learned, what they love, and what to try next.
        </p>

        {streak > 0 && (
          <p className="mt-3 inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-200">
            🔥 {streak} day explorer streak
          </p>
        )}

        {childId && insights ? (
          <>
            <div className="mt-5 rounded-[24px] border border-primary/25 bg-primary/[0.06] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-4 w-4" aria-hidden />
                Today&apos;s explorer
              </div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-foreground">
                    {insights.overallProgressPct}%
                  </p>
                  <p className="text-sm text-muted-foreground">overall progress across all worlds</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold text-foreground">
                    {insights.totalStickers} stickers · {insights.totalAchievements} stars
                  </p>
                  {streak > 0 && (
                    <p className="text-amber-200">🔥 {streak} day streak</p>
                  )}
                </div>
              </div>
              <Progress value={insights.overallProgressPct} className="mt-3 h-2" />
            </div>

            <div className="mt-6">
              <HubDailyAdventureTeaser childId={childId} />
            </div>

            <section className="mt-8 space-y-3" aria-labelledby="play-worlds-heading">
              <h2 id="play-worlds-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Play a world
              </h2>
              <ul className="space-y-3">
                {insights.worldRows.map((row) => (
                  <li key={row.worldId}>
                    <DiscoveryHubWorldCard row={row} />
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-8">
              <LearningMap childId={childId} catalogSizes={DISCOVERY_CATALOG_SIZES} />
            </div>

            <div className="mt-8">
              <AssetCoverageDashboard />
            </div>

            <div className="mt-10 space-y-5 border-t border-border/60 pt-8">
              <UnifiedParentSummary insights={insights} />
              <UnifiedParentDashboard childId={childId} />
            </div>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            <DiscoveryEmptyState variant="noChild" />
            <Button asChild className="rounded-full px-6">
              <AddChildLink source="discovery-worlds-hub-empty">
                <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                Add child
              </AddChildLink>
            </Button>
          </div>
        )}

      </main>
    </div>
  );
}
