import { useEffect, useState } from "react";
import { AlertTriangle, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CANCELLATION_RETENTION, ANNUAL_UPSELL } from "@workspace/subscription-marketing";
import { FF_CANCEL_ANNUAL_SAVE } from "@/lib/subscription-feature-flags";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { isIndiaRegion } from "@/lib/geo";

type Props = {
  open: boolean;
  onClose: () => void;
  periodEnd: string | null;
  onSwitchToAnnual: () => void;
  onConfirmCancel: () => void;
  cancelling: boolean;
};

export function SubscriptionCancelDialog({
  open,
  onClose,
  periodEnd,
  onSwitchToAnnual,
  onConfirmCancel,
  cancelling,
}: Props) {
  const [step, setStep] = useState<"save" | "confirm">("save");

  useEffect(() => {
    if (open) {
      setStep(FF_CANCEL_ANNUAL_SAVE ? "save" : "confirm");
      if (FF_CANCEL_ANNUAL_SAVE) {
        trackSubscriptionEvent({ event: "cancel_save_offer_shown", plan: "yearly" });
      }
    }
  }, [open]);

  if (!open) return null;

  const priceHint = isIndiaRegion() ? "≈ ₹125/month" : "≈ $3.33/month";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-card">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {FF_CANCEL_ANNUAL_SAVE && step === "save" ? (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <Crown className="h-8 w-8 text-primary" />
              <h2 className="text-lg font-extrabold text-foreground">
                {ANNUAL_UPSELL.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Switch to Growth Year before you pause—{priceHint}, save ~33%, uninterrupted coaching and learning.
              </p>
            </div>
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                className="w-full font-bold"
                onClick={() => {
                  trackSubscriptionEvent({
                    event: "cancel_save_offer_accepted",
                    plan: "yearly",
                  });
                  trackSubscriptionEvent({ event: "annual_upgrade", source: "cancel_save" });
                  onClose();
                  onSwitchToAnnual();
                }}
              >
                Switch to Growth Year
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  trackSubscriptionEvent({ event: "cancel_continue" });
                  setStep("confirm");
                }}
              >
                Continue Cancellation
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                {CANCELLATION_RETENTION.keepCta}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-extrabold text-foreground">
              {CANCELLATION_RETENTION.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {periodEnd
                ? CANCELLATION_RETENTION.bodyPeriodEnd.replace("{{date}}", periodEnd)
                : CANCELLATION_RETENTION.body}
            </p>
            <p className="text-xs text-muted-foreground">{CANCELLATION_RETENTION.note}</p>
            <div className="mt-2 flex w-full gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {CANCELLATION_RETENTION.keepCta}
              </Button>
              <Button
                className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                disabled={cancelling}
                onClick={() => {
                  trackSubscriptionEvent({ event: "cancel_confirmed" });
                  onConfirmCancel();
                }}
              >
                {CANCELLATION_RETENTION.cancelCta}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
