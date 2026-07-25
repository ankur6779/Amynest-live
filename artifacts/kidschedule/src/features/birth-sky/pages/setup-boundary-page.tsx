/**
 * TEMPORARY MILESTONE SEAM — IM-0 only.
 *
 * Pack 2 setup step route ownership without Birth Profile persistence.
 * Replaced entirely by IM-1 progressive setup (date → create).
 *
 * Do not extend this page into permanent product UI.
 */

import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../components/birth-sky-module-shell";
import type { BirthSkySetupStep } from "../lib/entry-resolver";

/** @internal IM-0 seam — delete/replace in IM-1 */
export const BIRTH_SKY_SETUP_BOUNDARY_SEAM = "im0_temporary_milestone_seam" as const;

/** IM-0 boundary steps (subset of setup). */
type BirthSkySetupBoundaryStep = Extract<
  BirthSkySetupStep,
  "date" | "time" | "place" | "consent" | "review"
>;

const STEP_COPY: Record<
  BirthSkySetupBoundaryStep,
  { title: string; helper: string }
> = {
  date: {
    title: "When did they arrive?",
    helper: "Used for the Sun and the day-sky.",
  },
  time: {
    title: "Do you know the exact time?",
    helper:
      "Time unlocks Ascendant and houses. Without it, a Day Sky is still meaningful.",
  },
  place: {
    title: "Where were they born?",
    helper: "Location is used only to place the sky — never for ads.",
  },
  consent: {
    title: "Your privacy",
    helper:
      "Birth details stay private. Parent-only. Deletable anytime. Not used for ads. Optional module.",
  },
  review: {
    title: "Reveal their sky",
    helper: "Review birth details before the sky is formed.",
  },
};

type SetupBoundaryPageProps = {
  step: BirthSkySetupBoundaryStep;
  onBack: () => void;
};

export function BirthSkySetupBoundaryPage({ step, onBack }: SetupBoundaryPageProps) {
  const copy = STEP_COPY[step];
  return (
    <BirthSkyModuleShell
      title="Birth Sky"
      onBack={onBack}
      testId={`birth-sky-setup-boundary-${step}`}
    >
      {/* data-seam marks temporary IM-0 boundary for QA / IM-1 removal */}
      <div data-birth-sky-seam={BIRTH_SKY_SETUP_BOUNDARY_SEAM} hidden />
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(40_20%_96%/0.55)]">
        Date · Time · Place
      </p>
      <h2 className="mt-3 font-quicksand text-2xl font-bold">{copy.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">{copy.helper}</p>
      <Button
        type="button"
        variant="secondary"
        className="mt-8 min-h-12 w-full rounded-xl"
        onClick={onBack}
        data-testid="birth-sky-setup-boundary-back"
      >
        Back
      </Button>
    </BirthSkyModuleShell>
  );
}
