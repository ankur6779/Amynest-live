import type { PlanPricePresentation } from "@/lib/plan-price";

type Props = {
  presentation: PlanPricePresentation;
  savings?: string | null;
  priceClassName: string;
  compact?: boolean;
};

/** Primary billed amount → monthly equivalent → cadence → tier hint. */
export function PlanPriceLines({
  presentation,
  savings,
  priceClassName,
  compact = false,
}: Props) {
  const equivClass = compact
    ? "text-[10px] font-bold text-white/75"
    : "text-[10px] font-bold text-white/75 sm:text-[11px]";
  const cadenceClass = compact
    ? "text-[10px] text-white/50"
    : "text-[10px] text-white/50 sm:text-[11px]";
  const hintClass = compact
    ? "text-[9px] font-semibold uppercase tracking-wide text-white/40"
    : "text-[10px] font-medium text-white/45";

  return (
    <div className="mb-1 space-y-0.5">
      <div className={priceClassName}>{presentation.primaryLine}</div>
      {savings && (
        <div className="text-xs font-extrabold text-primary">{savings}</div>
      )}
      {presentation.monthlyEquivalentLine && (
        <p className={equivClass}>{presentation.monthlyEquivalentLine}</p>
      )}
      <p className={cadenceClass}>{presentation.billingCadenceLine}</p>
      {presentation.tierHintLine && (
        <p className={hintClass}>{presentation.tierHintLine}</p>
      )}
    </div>
  );
}
