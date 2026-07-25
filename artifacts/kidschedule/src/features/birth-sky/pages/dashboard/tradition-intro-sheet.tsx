/**
 * Tradition Introduction gate (Pack 5 §1 / Phase 1).
 * Blocking first-entry experience — no premium gate.
 */

import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "../../lib/focus-trap";

type Props = {
  reducedMotion: boolean;
  onAccept: () => void;
  onAstronomyOnly: () => void;
};

export function BirthSkyTraditionIntroSheet({
  reducedMotion,
  onAccept,
  onAstronomyOnly,
}: Props) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Escape must not dismiss — parent must choose Accept or Astronomy only.
  useFocusTrap(rootRef, true);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center",
        !reducedMotion && "animate-in fade-in duration-300",
      )}
      data-testid="birth-sky-tradition-intro"
    >
      <div
        ref={panelRef}
        className={cn(
          "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[hsl(12_40%_55%/0.35)] bg-[hsl(220_28%_12%)] p-5 shadow-xl",
          !reducedMotion && "animate-in slide-in-from-bottom-4 duration-300",
        )}
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(12_45%_72%)]">
          Traditional lens
        </p>
        <h2 id={titleId} className="mt-2 text-xl font-semibold text-[hsl(40_20%_96%)]">
          What tradition means here
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[hsl(40_20%_96%/0.82)]">
          <p>
            <strong className="text-[hsl(40_20%_96%)]">What this is:</strong> optional cultural
            stories and historical meanings some families have shared about the night sky.
          </p>
          <p>
            <strong className="text-[hsl(40_20%_96%)]">What this isn’t:</strong> scientific proof,
            a prediction about your child’s future, or medical or career certainty.
          </p>
          <p>
            Astronomy (facts about the sky) stays separate. Traditional cards are always labeled{" "}
            <em>In tradition</em>.
          </p>
        </div>
        <div className="mt-6 space-y-2">
          <Button
            type="button"
            className="min-h-12 w-full rounded-xl"
            onClick={onAccept}
            data-testid="birth-sky-tradition-intro-accept"
          >
            Continue to Tradition
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full rounded-xl"
            onClick={onAstronomyOnly}
            data-testid="birth-sky-tradition-intro-astronomy-only"
          >
            Keep Astronomy only
          </Button>
        </div>
      </div>
    </div>
  );
}
