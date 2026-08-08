/**
 * Regeneration Loading Overlay (Pack 7 §3 / Pack 4 path — not first-run Formation).
 * Living ON: calm understanding copy — no "Reading the Stars" theatre.
 */

import { useRef } from "react";
import { AmyAstroEmblem } from "../../components/amy-astro-emblem";
import { useFocusTrap } from "../../lib/focus-trap";
import {
  isBirthSkyLivingV1Enabled,
  livingRegenLoadingCopy,
} from "@/lib/birth-sky/living-room";
import "../../design/amy-astro.css";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const living = isBirthSkyLivingV1Enabled();
  useFocusTrap(rootRef, visible, failed ? onDismiss : undefined);
  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={
        failed
          ? "Sky update failed"
          : living
            ? livingRegenLoadingCopy()
            : "Reading the Stars"
      }
      aria-busy={!failed}
      tabIndex={-1}
      className="amy-astro-root fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      data-testid="birth-sky-regen-overlay"
    >
      <div className="amy-astro-glass w-full max-w-sm rounded-2xl border border-[hsl(42_50%_60%/0.22)] p-6 text-center">
        {failed ? (
          <>
            <AmyAstroEmblem size={64} interactive={false} />
            <h3 className="amy-astro-display mt-3 text-lg font-semibold text-[hsl(42_70%_78%)]">
              Couldn’t update sky
            </h3>
            <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">
              Your previous sky is unchanged. You can retry when ready.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="amy-astro-btn-premium min-h-12 rounded-xl bg-white/15 text-sm font-bold"
                onClick={onRetry}
                data-testid="birth-sky-regen-retry"
              >
                Retry
              </button>
              <button
                type="button"
                className="amy-astro-btn-text min-h-12 rounded-xl text-sm font-semibold text-[hsl(40_20%_96%/0.78)] hover:bg-white/[0.06]"
                onClick={onDismiss}
                data-testid="birth-sky-regen-dismiss"
              >
                Dismiss
              </button>
            </div>
          </>
        ) : (
          <>
            <AmyAstroEmblem size={living ? 56 : 72} interactive={false} />
            <p className="mt-4 text-sm font-semibold text-[hsl(42_70%_78%)]" role="status">
              {living ? livingRegenLoadingCopy() : "Reading the Stars…"}
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
