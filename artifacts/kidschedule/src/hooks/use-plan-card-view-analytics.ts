import { useEffect, useRef } from "react";
import type { PlanCard } from "@/hooks/use-subscription";
import { FF_MONTHLY_PRIMARY_PRICE } from "@/lib/subscription-feature-flags";
import { trackPlanCardViewed } from "@/lib/subscription-plans";

/**
 * Fire plan_card_viewed once per plan id when cards mount (pricing hierarchy experiment).
 */
export function usePlanCardViewAnalytics(
  plans: PlanCard[] | undefined,
  source: string,
  enabled = true,
): void {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !plans?.length) return;
    for (const plan of plans) {
      if (seen.current.has(plan.id)) continue;
      seen.current.add(plan.id);
      trackPlanCardViewed(plan.id, source, {
        hierarchy: FF_MONTHLY_PRIMARY_PRICE ? "monthly_primary" : "billed_primary",
      });
    }
  }, [plans, source, enabled]);
}
