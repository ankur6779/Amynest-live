import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { planCta } from "@workspace/subscription-marketing";
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
  const cta = planCta(selected);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B0B1A]/95 px-4 pt-3 pb-[max(0.75rem,var(--sab,env(safe-area-inset-bottom,0px)))] backdrop-blur-md shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
      data-testid="pricing-sticky-cta"
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-white">{title}</p>
          <p className="text-lg font-black text-white leading-tight">{priceLine}</p>
          <p className="text-xs text-white/55 leading-snug">{billingLine}</p>
        </div>
        <Button
          type="button"
          disabled={disabled || busy}
          className="h-11 shrink-0 rounded-xl px-5 text-sm font-extrabold bg-gradient-to-r from-primary to-primary shadow-[0_6px_20px_rgba(255,78,205,0.45)]"
          onClick={() => {
            trackSubscriptionEvent({
              event: "checkout_started",
              plan: selected,
              source: "pricing_sticky_cta",
            });
            onCheckout();
          }}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            cta
          )}
        </Button>
      </div>
    </div>
  );
}
