import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import type { Plan, PlanCard } from "@/hooks/use-subscription";
import { formatStickyPriceSummary } from "@/lib/pricing-plan-card-ui";
import type { PlanBillingLabels, StorePlanPrice } from "@/lib/plan-price";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

type Props = {
  selected: Exclude<Plan, "free">;
  selectedPlan: PlanCard | undefined;
  storePriceLabel?: string;
  store?: StorePlanPrice | null;
  billingLabels?: PlanBillingLabels;
  disabled?: boolean;
  busy?: boolean;
  onCheckout: () => void;
};

export function SubscriptionPricingStickyCta({
  selected,
  selectedPlan,
  storePriceLabel,
  store,
  billingLabels,
  disabled = false,
  busy = false,
  onCheckout,
}: Props) {
  if (!selectedPlan) return null;

  const { title, priceLine, billingLine } = formatStickyPriceSummary(
    selectedPlan,
    storePriceLabel,
    store,
    billingLabels,
  );

  return (
    <div
      className="pricing-living-sticky fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
      data-testid="pricing-sticky-cta"
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--atmosphere-night-ink)]">{title}</p>
          <p className="text-lg font-bold leading-tight text-[var(--atmosphere-night-ink)]">{priceLine}</p>
          <p className="text-[10px] leading-snug text-[rgba(244,238,230,0.55)]">{billingLine}</p>
        </div>
        <Button
          type="button"
          disabled={disabled || busy}
          className="pricing-living-cta h-11 shrink-0 rounded-xl px-5 text-sm"
          onClick={() => {
            trackSubscriptionEvent({
              event: "checkout_started",
              plan: selected,
              source: "pricing_sticky_cta",
            });
            onCheckout();
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : PREMIUM_VOICE.continueCta}
        </Button>
      </div>
    </div>
  );
}
