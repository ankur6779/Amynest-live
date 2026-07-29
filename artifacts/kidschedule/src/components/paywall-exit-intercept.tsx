import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onContinue: () => void;
  onDismiss: () => void;
  continueLabel?: string;
};

export function PaywallExitIntercept({
  open,
  onContinue,
  onDismiss,
  continueLabel = "Continue Premium",
}: Props) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-black/55 px-4 py-6"
      data-testid="paywall-exit-intercept"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-exit-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#14102a] p-5 text-white shadow-xl">
        <h3 id="paywall-exit-title" className="text-lg font-extrabold">
          Before you go…
        </h3>
        <p className="mt-2 text-sm text-white/70 leading-relaxed">
          Your progress is safely saved. You can continue anytime.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-white/80">
          {["Unlimited AI", "Weekly Reports", "Health Lab", "Learning"].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-primary" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <Button
            type="button"
            className="w-full h-11 font-extrabold"
            onClick={onContinue}
            data-testid="paywall-exit-continue"
          >
            {continueLabel}
          </Button>
          <button
            type="button"
            className="w-full py-2 text-sm font-semibold text-white/60 hover:text-white/85"
            onClick={onDismiss}
            data-testid="paywall-exit-dismiss"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
