import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X } from "lucide-react";
import { Link } from "wouter";
import { useValueBridge } from "@/contexts/value-bridge-context";
import { pricingCheckoutHref } from "@/lib/internal-trial";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { trackValueBridgeEvent } from "@/lib/value-bridge-analytics";
import { FF_VALUE_BRIDGE_INVITES } from "@/lib/subscription-feature-flags";
import {
  isValueBridgeEligible,
  markValueBridgeShownToday,
  valueBridgeCopy,
  type ValueBridgeMoment,
} from "@/lib/value-bridge";
import { useSubscription } from "@/hooks/use-subscription";

type Props = {
  /** Only render when this moment is active. */
  moment: ValueBridgeMoment;
  className?: string;
};

/**
 * Phase 1 inline contextual premium invitation — reuses trial banner styling.
 */
export function SubscriptionValueBridgeBanner({ moment, className }: Props) {
  const { t } = useTranslation();
  const { entitlements } = useSubscription();
  const {
    active,
    dismissValueBridge,
    clearValueBridge,
    analyticsMeta,
  } = useValueBridge();
  const shownRef = useRef(false);

  const isActive = active?.moment === moment;

  useEffect(() => {
    if (!isActive || !isValueBridgeEligible(entitlements) || shownRef.current) {
      return;
    }
    shownRef.current = true;
    markValueBridgeShownToday(moment);
    const copy = valueBridgeCopy(moment);
    trackValueBridgeEvent("value_bridge_shown", copy.source, analyticsMeta);
  }, [isActive, entitlements, moment, analyticsMeta]);

  if (
    !FF_VALUE_BRIDGE_INVITES ||
    !isActive ||
    !isValueBridgeEligible(entitlements)
  ) {
    return null;
  }

  const copy = valueBridgeCopy(moment);
  const href = pricingCheckoutHref(copy.source);

  const message = t(`subscription.value_bridge.${moment}.message`, {
    defaultValue: copy.message,
  });
  const cta = t(`subscription.value_bridge.${moment}.cta`, {
    defaultValue: copy.cta,
  });

  const onDismiss = () => {
    trackValueBridgeEvent("value_bridge_dismissed", copy.source, analyticsMeta);
    dismissValueBridge();
  };

  const onCta = () => {
    trackValueBridgeEvent("value_bridge_clicked", copy.source, analyticsMeta);
    trackSubscriptionEvent({
      event: "checkout_started",
      source: copy.source,
      plan: "yearly",
      extra: {
        route: analyticsMeta.route,
        trial_state: analyticsMeta.trialState,
        subscription_state: analyticsMeta.subscriptionState,
      },
    });
    clearValueBridge();
  };

  return (
    <div
      className={[
        "flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-sm",
        className ?? "mx-4 mb-3",
      ].join(" ")}
      data-testid="subscription-value-bridge-banner"
      data-value-bridge-moment={moment}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="font-semibold text-foreground">{message}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={href}
          className="text-xs font-bold text-primary underline"
          onClick={onCta}
        >
          {cta}
        </Link>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label={t("common.dismiss", { defaultValue: "Dismiss" })}
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
