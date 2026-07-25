/**
 * Regeneration Loading Overlay (Pack 7 §3 / Pack 4 path — not first-run Formation).
 */

type Props = {
  visible: boolean;
  failed: boolean;
  onRetry: () => void;
  onDismiss: () => void;
};

export function BirthSkyRegenerateOverlay({
  visible,
  failed,
  onRetry,
  onDismiss,
}: Props) {
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={failed ? "Sky update failed" : "Updating sky"}
      aria-busy={!failed}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      data-testid="birth-sky-regen-overlay"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[hsl(220_28%_12%)] p-6 text-center">
        {failed ? (
          <>
            <h3 className="font-quicksand text-lg font-semibold">Couldn’t update sky</h3>
            <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">
              Your previous sky is unchanged. You can retry when ready.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="min-h-11 rounded-xl bg-white/15 text-sm font-bold"
                onClick={onRetry}
                data-testid="birth-sky-regen-retry"
              >
                Retry
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl bg-white/5 text-sm font-semibold"
                onClick={onDismiss}
                data-testid="birth-sky-regen-dismiss"
              >
                Dismiss
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-white/30"
              aria-hidden
            />
            <p className="mt-4 text-sm font-semibold" role="status">
              Updating sky…
            </p>
            <p className="mt-1 text-xs text-[hsl(40_20%_96%/0.55)]">
              Past snapshots stay preserved
            </p>
          </>
        )}
      </div>
    </div>
  );
}
