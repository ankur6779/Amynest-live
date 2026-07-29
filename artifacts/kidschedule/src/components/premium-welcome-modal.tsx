import { useEffect } from "react";
import { Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

const UNLOCKED = [
  "Unlimited AI",
  "Learning",
  "Health Lab",
  "Reports",
  "Games",
  "Birth Sky",
] as const;

type Props = {
  open: boolean;
  onContinue: () => void;
};

export function PremiumWelcomeModal({ open, onContinue }: Props) {
  useEffect(() => {
    if (!open) return;
    trackSubscriptionEvent({
      event: "premium_welcome_viewed",
      source: "premium_welcome",
    });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onContinue()}>
      <DialogContent
        className="max-w-sm border-0 bg-gradient-to-br from-[#0B0B1A] via-[#1A0B2E] to-[#0B0B1A] text-white p-6"
        data-testid="premium-welcome-modal"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600">
            <Sparkles className="h-7 w-7 text-white" aria-hidden />
          </div>
          <h2 className="text-2xl font-extrabold">Welcome to AmyNest Premium</h2>
          <p className="mt-2 text-sm text-white/70">
            Everything you need to keep growing with your child — unlocked.
          </p>
        </div>
        <ul className="mt-5 space-y-2">
          {UNLOCKED.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold"
            >
              <Check className="h-4 w-4 text-emerald-300" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          className="mt-5 w-full h-12 font-extrabold"
          onClick={() => {
            trackSubscriptionEvent({
              event: "premium_welcome_continue",
              source: "premium_welcome",
            });
            onContinue();
          }}
          data-testid="premium-welcome-continue"
        >
          Continue Your Parenting Journey
        </Button>
      </DialogContent>
    </Dialog>
  );
}
