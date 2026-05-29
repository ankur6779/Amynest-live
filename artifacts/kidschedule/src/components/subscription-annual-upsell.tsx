import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ANNUAL_UPSELL } from "@workspace/subscription-marketing";
import type { Entitlements, Plan } from "@/hooks/use-subscription";

type Props = {
  entitlements: Entitlements | null | undefined;
  selected: Exclude<Plan, "free">;
  onSelectAnnual: () => void;
};

/** Nudge monthly / 6-month selectors toward annual when not yet premium. */
export function SubscriptionAnnualUpsell({ entitlements, selected, onSelectAnnual }: Props) {
  const { t } = useTranslation();
  if (entitlements?.isPremium) return null;
  if (selected === "yearly") return null;

  return (
    <div
      className="mx-4 mb-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 to-transparent px-4 py-4"
      data-testid="subscription-annual-upsell"
    >
      <div className="flex items-start gap-3">
        <Crown className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {t("pricing.annual_upsell_badge", { defaultValue: ANNUAL_UPSELL.savingsHint })}
          </p>
          <h3 className="mt-1 text-sm font-extrabold text-white">
            {t("pricing.annual_upsell_title", { defaultValue: ANNUAL_UPSELL.title })}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {t("pricing.annual_upsell_subtitle", { defaultValue: ANNUAL_UPSELL.subtitle })}
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3 rounded-full font-bold"
            onClick={onSelectAnnual}
          >
            {t("pricing.annual_upsell_cta", { defaultValue: ANNUAL_UPSELL.cta })}
          </Button>
        </div>
      </div>
    </div>
  );
}
