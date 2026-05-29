import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WIN_BACK } from "@workspace/subscription-marketing";
import { useSubscription } from "@/hooks/use-subscription";
import { isLapsedSubscriber } from "@/components/subscription-win-back-banner";
import { getTrialStartedLocally } from "@/lib/subscription-funnel-storage";
import {
  markWinbackDismissed,
  wasWinbackDismissedRecently,
} from "@/lib/subscription-funnel-storage";
import { FF_WINBACK_MODAL } from "@/lib/subscription-feature-flags";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

export function SubscriptionWinbackModal() {
  const { entitlements, isPremium } = useSubscription();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const expiredTrial =
    !isPremium &&
    !!getTrialStartedLocally() &&
    entitlements?.status === "free" &&
    !entitlements?.isTrialing;

  const show =
    FF_WINBACK_MODAL &&
    !isPremium &&
    (isLapsedSubscriber(entitlements) || expiredTrial) &&
    !wasWinbackDismissedRecently();

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => {
      setOpen(true);
      trackSubscriptionEvent({ event: "winback_shown", source: "app_open" });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [show]);

  if (!show) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) markWinbackDismissed();
        setOpen(v);
      }}
    >
      <DialogContent className="max-w-sm" data-testid="subscription-winback-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-primary" />
            {WIN_BACK.headline}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {WIN_BACK.subheadline}
        </p>
        <p className="text-xs text-muted-foreground">
          Your routines, learning paths, and coaching history are still saved.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full font-bold"
            onClick={() => {
              trackSubscriptionEvent({
                event: "winback_clicked",
                source: "winback_modal",
                plan: "yearly",
              });
              setOpen(false);
              setLocation("/pricing?plan=yearly&source=winback");
            }}
          >
            {WIN_BACK.cta}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setOpen(false);
              markWinbackDismissed();
              setLocation("/pricing?source=winback_secondary");
            }}
          >
            {WIN_BACK.secondaryCta}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
