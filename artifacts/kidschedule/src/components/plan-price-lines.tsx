import type { PlanPricePresentation } from "@/lib/plan-price";
import { pricingLivingPriceDisplay } from "@/lib/pricing-plan-card-ui";

type Props = {
  presentation: PlanPricePresentation;
  savings?: string | null;
  priceClassName: string;
  compact?: boolean;
  /** Pricing page: billed amount is the large line; equivalent stays secondary. */
  preferBilledPrimary?: boolean;
};

function supportingClass(compact: boolean): string {
  return compact
    ? "text-[10px] font-bold text-white/75 sm:text-[11px]"
    : "text-[11px] font-bold text-white/80 sm:text-xs";
}

function secondaryClass(compact: boolean): string {
  return compact
    ? "text-[10px] text-white/55 leading-snug"
    : "text-[11px] text-white/50 leading-snug sm:text-xs";
}

function hintClass(compact: boolean): string {
  return compact
    ? "text-[9px] font-semibold uppercase tracking-wide text-white/45"
    : "text-[10px] font-semibold uppercase tracking-wide text-white/45";
}

/**
 * Primary monthly-equivalent → billed amount (compliance) → savings → tier hint.
 * When preferBilledPrimary, billed amount is visually primary (display only).
 */
export function PlanPriceLines({
  presentation,
  savings,
  priceClassName,
  compact = false,
  preferBilledPrimary = false,
}: Props) {
  if (preferBilledPrimary) {
    const living = pricingLivingPriceDisplay(presentation);
    return (
      <div className="pricing-living-price-block">
        <div className={priceClassName}>{living.amountLine}</div>
        <p className="pricing-living-period">{living.periodLine}</p>
        {living.equivalentLine && (
          <p className="pricing-living-equivalent">{living.equivalentLine}</p>
        )}
        {savings && <p className="pricing-living-savings">{savings}</p>}
      </div>
    );
  }

  return (
    <div className="mb-1 space-y-0.5">
      <div className={priceClassName}>{presentation.primaryLine}</div>
      <p className={secondaryClass(compact)}>{presentation.secondaryBillingLine}</p>
      {savings && (
        <p className={`${supportingClass(compact)} text-primary`}>✓ {savings}</p>
      )}
      {presentation.tierHintLine && (
        <p className={hintClass(compact)}>✓ {presentation.tierHintLine}</p>
      )}
    </div>
  );
}
