import { RouteLoadingShell } from "@/components/route-loading-shell";
import { ApiRetryShell } from "@/components/api-retry-shell";
import { resolveLearningJourneyAccess } from "@/lib/learning-journey-access";
import { ROUTE_LOADING_FAIL_OPEN_MS, useFailOpenAfter } from "@/lib/loading-fail-open";
import { getListChildrenQueryKey, useListChildren } from "@workspace/api-client-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useHubJourney } from "@/hooks/use-hub-journey";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { ACTIVE_CHILD_STORAGE_KEY } from "@/lib/coach-age-nav";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import {
  isGrowLivingV1Enabled,
  livingGrowPremiumGateBody,
  livingGrowPremiumGateTitle,
} from "@/lib/grow/living-room";
import { AmyNestLeaveContinuity } from "@/components/amy-nest-leave-continuity";
import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode } from "react";

import "@/components/grow/grow-living-deep.css";

type Props = {
  children: ReactNode;
};

/**
 * After Parent Hub journey ends, block Learning routes for free users.
 * Premium and free-journey users pass through.
 * Presentation only when Grow living ON — entitlement logic unchanged.
 */
export function LearningJourneyGate({ children }: Props) {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const { data: childrenList, isFetched, isError: childrenError, refetch: refetchChildren } = useListChildren({
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

  const access = resolveLearningJourneyAccess({
    isPremium,
    gateLoading,
    gateTimedOut,
    hasError: childrenError,
    journeyLocked: hubJourney.isJourneyLocked,
    accessLoaded: !!hubJourney.access,
  });

  if (access.kind === "allowed") return <>{children}</>;
  if (access.kind === "loading") return <RouteLoadingShell />;
  if (access.kind === "retry") {
    return <ApiRetryShell onRetry={() => void refetchChildren()} />;
  }
  return <LearningPremiumPreview />;
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
  const living = isGrowLivingV1Enabled();

  return (
    <main
      className={cn(
        "mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-10 text-center",
        living && "gw-living-deep",
      )}
      data-gw-living={living ? "1" : undefined}
    >
      <div
        className={cn(
          "rounded-[28px] p-6",
          living
            ? "gw-living-deep-panel border border-[rgba(232,212,184,0.28)]"
            : "border border-violet-500/20 bg-white/[0.04]",
        )}
      >
        <p
          className={cn(
            "text-xs font-bold uppercase tracking-[0.22em]",
            living ? "gw-living-deep-eyebrow" : "text-violet-300",
          )}
        >
          {living ? PREMIUM_VOICE.includesLabel : "What you unlock"}
        </p>
        <h1
          className={cn(
            "mt-3 text-2xl text-foreground",
            living ? "gw-living-deep-title font-bold" : "font-black",
          )}
        >
          {living ? livingGrowPremiumGateTitle() : "Unlock complete learning journeys"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {living
            ? livingGrowPremiumGateBody()
            : "Your free Parent Hub exploration has ended. Keep phonics, study, abacus, olympiad, and spelling progressing every day."}
        </p>
        <ul className="mt-5 space-y-2 text-left text-sm text-muted-foreground">
          {(living
            ? [
                "Calm phonics & reading practice",
                "Quiet study and number practice",
                "Spelling without pressure",
              ]
            : [
                "Full phonics & reading path",
                "Smart Study and math practice",
                "Olympiad & spelling mastery",
              ]
          ).map((benefit) => (
            <li
              key={benefit}
              className={cn(
                "rounded-2xl px-4 py-3",
                living
                  ? "border border-[rgba(232,212,184,0.2)] bg-[rgba(232,212,184,0.06)]"
                  : "border border-white/5 bg-white/[0.04]",
              )}
            >
              {benefit}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={cn(
            "mt-6 min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-bold",
            living
              ? "gw-living-deep-primary-btn"
              : "bg-violet-600 text-white",
          )}
          onClick={() =>
            openSubscriptionGate({
              reason: "learning_locked",
              source: "route_learning_journey",
            })
          }
        >
          {living ? PREMIUM_VOICE.continueCta : "Unlock All Learning"}
        </button>
        {living ? (
          <p className="mt-3 text-[11px] text-muted-foreground">{PREMIUM_VOICE.invitation}</p>
        ) : (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Cancel anytime · Secure purchase · Restore purchases anytime
          </p>
        )}
        {living ? (
          <AmyNestLeaveContinuity
            className="mt-4 text-left"
            continueHref="/parenting-hub"
            continueLabel="Back to rooms"
          />
        ) : null}
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
