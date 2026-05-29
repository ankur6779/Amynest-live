import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { WIN_BACK } from "@workspace/subscription-marketing";
import type { Entitlements } from "@/hooks/use-subscription";

/** Shown when a user previously subscribed but is no longer premium. */
export function isLapsedSubscriber(entitlements: Entitlements | null | undefined): boolean {
  if (!entitlements || entitlements.isPremium) return false;
  if (entitlements.provider === "none" || entitlements.provider === "manual") return false;
  return entitlements.status === "canceled" || entitlements.status === "past_due";
}

type Props = {
  entitlements: Entitlements | null | undefined;
  onCta?: () => void;
};

export function SubscriptionWinBackBanner({ entitlements, onCta }: Props) {
  const { t } = useTranslation();
  if (!isLapsedSubscriber(entitlements)) return null;

  return (
    <div
      className="mx-4 mb-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-center sm:mb-3 sm:rounded-2xl sm:px-4 sm:py-3"
      data-testid="subscription-win-back"
    >
      <Heart className="mx-auto mb-1 h-4 w-4 text-primary sm:mb-2 sm:h-5 sm:w-5" aria-hidden />
      <h2 className="text-sm font-extrabold text-white sm:text-base">
        {t("pages.pricing.win_back_headline", { defaultValue: WIN_BACK.headline })}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/70">
        {t("pages.pricing.win_back_subtitle", { defaultValue: WIN_BACK.subheadline })}
      </p>
      {onCta && (
        <Button
          type="button"
          size="sm"
          className="mt-3 rounded-full font-bold"
          onClick={onCta}
        >
          {t("pages.pricing.win_back_cta", { defaultValue: WIN_BACK.cta })}
        </Button>
      )}
    </div>
  );
}
