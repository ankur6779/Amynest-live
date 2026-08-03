import type { ComponentType, ReactNode } from "react";
import { getListChildrenQueryKey, useListChildren } from "@workspace/api-client-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useHubJourney } from "@/hooks/use-hub-journey";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { ACTIVE_CHILD_STORAGE_KEY } from "@/lib/coach-age-nav";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import { ROUTE_LOADING_FAIL_OPEN_MS, useFailOpenAfter } from "@/lib/loading-fail-open";
import { shouldFailClosedLearningJourneyOnTimeout } from "@/lib/route-entitlement-gate";

type Props = {
  children: ReactNode;
};

/**
 * After Parent Hub journey ends, block Learning routes for free users.
 * Premium and free-journey users pass through.
 */
export function LearningJourneyGate({ children }: Props) {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const { data: childrenList, isFetched, isError: childrenError } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      staleTime: 30_000,
    },
  });

  const childId = resolveActiveChildId(childrenList);
  const hubJourney = useHubJourney(childId);

  const gateLoading =
    !isPremium &&
    (subscriptionLoading ||
      (!isFetched && !childrenError) ||
      (!!childId && hubJourney.isLoading && !hubJourney.access));
  const gateTimedOut = useFailOpenAfter(gateLoading, ROUTE_LOADING_FAIL_OPEN_MS);

  if (isPremium) return <>{children}</>;
  if (gateLoading && !gateTimedOut) return <RouteLoadingShell />;
  // Timed out without journey access — fail closed so locked free users cannot bypass.
  if (
    shouldFailClosedLearningJourneyOnTimeout({
      gateTimedOut,
      hasAccess: !!hubJourney.access,
    })
  ) {
    return <LearningPremiumPreview />;
  }
  if (hubJourney.isJourneyLocked) return <LearningPremiumPreview />;
  return <>{children}</>;
}

function resolveActiveChildId(
  childrenList: Array<{ id: number }> | undefined,
): number | null {
  if (!childrenList?.length) return null;
  if (typeof window !== "undefined") {
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    if (Number.isFinite(saved) && childrenList.some((c) => c.id === saved)) {
      return saved;
    }
  }
  return childrenList[0]?.id ?? null;
}

function LearningPremiumPreview() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <div className="rounded-[28px] border border-violet-500/20 bg-white/[0.04] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">
          What you unlock
        </p>
        <h1 className="mt-3 text-2xl font-black text-foreground">
          Unlock complete learning journeys
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your free Parent Hub exploration has ended. Keep phonics, study,
          abacus, olympiad, and spelling progressing every day.
        </p>
        <ul className="mt-5 space-y-2 text-left text-sm text-muted-foreground">
          {[
            "Full phonics & reading path",
            "Smart Study and math practice",
            "Olympiad & spelling mastery",
          ].map((benefit) => (
            <li
              key={benefit}
              className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3"
            >
              {benefit}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"
          onClick={() =>
            openSubscriptionGate({
              reason: "learning_locked",
              source: "route_learning_journey",
            })
          }
        >
          Unlock All Learning
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Cancel anytime · Secure purchase · Restore purchases anytime
        </p>
      </div>
    </main>
  );
}

/** Wrap a page component so LearningJourneyGate runs inside the protected layout. */
export function withLearningJourneyGate(Component: ComponentType): ComponentType {
  function GatedPage() {
    return (
      <LearningJourneyGate>
        <Component />
      </LearningJourneyGate>
    );
  }
  GatedPage.displayName = `LearningJourneyGate(${Component.displayName ?? Component.name ?? "Page"})`;
  return GatedPage;
}
