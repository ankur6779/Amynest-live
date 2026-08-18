import { useState, useEffect } from "react";
import { Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ANNUAL_UPSELL } from "@workspace/subscription-marketing";
import { useSubscription, type Plan } from "@/hooks/use-subscription";
import { useNativeBilling } from "@/hooks/use-native-billing";
import { markPostPurchaseUpsellDismissed } from "@/lib/subscription-funnel-storage";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { usePricingRegion } from "@/lib/pricing-region";
import { getGuestCheckoutBlock } from "@/lib/anonymous-auth";
import { useUser } from "@/lib/firebase-auth-hooks";
import {
  isMonetizationSurfaceBlocked,
  releaseMonetizationSurface,
  tryClaimMonetizationSurface,
} from "@/lib/monetization-coordinator";

type Props = {
  purchasedPlan: Exclude<Plan, "free">;
  onDone: () => void;
};

export function PostPurchaseUpsellModal({ purchasedPlan, onDone }: Props) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const { checkoutRazorpay } = useSubscription();
  const nativeBilling = useNativeBilling();
  const { user } = useUser();
  const { isIndia } = usePricingRegion({
    enabled: !nativeBilling.wrapperPresent,
  });

  useEffect(() => {
    if (!open) return;
    if (isMonetizationSurfaceBlocked("subscription_modal")) {
      setOpen(false);
      onDone();
      return;
    }
    if (!tryClaimMonetizationSurface("subscription_modal")) {
      setOpen(false);
      onDone();
      return;
    }
    return () => releaseMonetizationSurface("subscription_modal");
  }, [open, onDone]);

  if (purchasedPlan === "yearly") return null;

  const dismiss = () => {
    releaseMonetizationSurface("subscription_modal");
    markPostPurchaseUpsellDismissed(purchasedPlan);
    trackSubscriptionEvent({
      event: "post_purchase_upsell_dismissed",
      plan: purchasedPlan,
    });
    setOpen(false);
    onDone();
  };

  const accept = async () => {
    const guestBlock = getGuestCheckoutBlock(user);
    if (guestBlock.blocked) {
      dismiss();
      return;
    }
    setBusy(true);
    trackSubscriptionEvent({
      event: "post_purchase_upsell_accepted",
      plan: "yearly",
      extra: { from: purchasedPlan },
    });
    trackSubscriptionEvent({ event: "annual_upgrade", plan: "yearly", source: "post_purchase" });
    trackSubscriptionEvent({
      event: "checkout_started",
      plan: "yearly",
      source: "post_purchase_upsell",
    });

    try {
      if (nativeBilling.wrapperPresent && nativeBilling.available) {
        const res = await nativeBilling.purchase("yearly", {
          source: "post_purchase_upsell",
        });
        if (res.ok && res.isPremiumSubscriber) {
          releaseMonetizationSurface("subscription_modal");
          setOpen(false);
          onDone();
          return;
        }
      } else if (isIndia) {
        const res = await checkoutRazorpay("yearly");
        if (res.ok) {
          trackSubscriptionEvent({ event: "purchase_success", plan: "yearly", source: "post_purchase_upsell" });
          releaseMonetizationSurface("subscription_modal");
          setOpen(false);
          onDone();
          return;
        }
      } else {
        releaseMonetizationSurface("subscription_modal");
        setOpen(false);
        onDone();
        window.location.assign("/pricing?plan=yearly&source=post_purchase_upsell");
        return;
      }
    } finally {
      setBusy(false);
    }
    dismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="max-w-sm" data-testid="post-purchase-upsell">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {ANNUAL_UPSELL.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{ANNUAL_UPSELL.subtitle}</p>
        <p className="text-xs font-semibold text-primary">{ANNUAL_UPSELL.savingsHint}</p>
        <div className="flex flex-col gap-2 pt-2">
          <Button className="w-full font-bold" disabled={busy} onClick={() => void accept()}>
            {ANNUAL_UPSELL.cta}
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy} onClick={dismiss}>
            {ANNUAL_UPSELL.dismiss}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function shouldShowPostPurchaseUpsell(plan: Plan): plan is "monthly" | "six_month" {
  return plan === "monthly" || plan === "six_month";
}
