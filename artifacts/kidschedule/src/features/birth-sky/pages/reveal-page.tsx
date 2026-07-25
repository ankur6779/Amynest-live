/**
 * Reveal experience (Pack 3 Part 4–5). IM-1 endpoint — no AI, no paywall, no Dashboard.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../components/birth-sky-module-shell";
import {
  BirthSkyContinuousSeal,
  SEAL_SLOT_SIZES,
} from "../components/birth-sky-seal-host";
import { REVEAL_CTA_ENABLE_MS } from "../constants/formation";
import { buildRevealViewModel } from "../application/view-models/reveal-vm";
import type { BirthProfile, SkySnapshot } from "../domain/models/birth-profile";
import { trackBirthSkyEvent } from "../lib/analytics";

type Props = {
  profile: BirthProfile;
  snapshot: SkySnapshot;
  childName: string;
  onEnter: () => void;
};

export function BirthSkyRevealPage({ profile, snapshot, childName, onEnter }: Props) {
  const vm = buildRevealViewModel(profile, snapshot, childName);
  const [ctaEnabled, setCtaEnabled] = useState(false);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.reveal_viewed", {
      mode: vm.mode,
      time_precision: profile.timePrecision,
      place_provided: Boolean(profile.birthPlace),
    });
    if (vm.mode === "day_sky") {
      trackBirthSkyEvent("birth_sky.day_sky_revealed", {
        mode: "day_sky",
        time_precision: "unknown",
      });
    } else {
      trackBirthSkyEvent("birth_sky.full_sky_revealed", {
        mode: "full",
        time_precision: profile.timePrecision,
      });
    }

    const tid = window.setTimeout(() => {
      setCtaEnabled(true);
    }, REVEAL_CTA_ENABLE_MS);
    return () => window.clearTimeout(tid);
  }, [vm.mode, profile.timePrecision, profile.birthPlace]);

  return (
    <BirthSkyModuleShell
      title="Birth Sky"
      hideTopBar
      testId="birth-sky-reveal"
    >
      <div className="flex flex-col items-center pt-10 text-center">
        <BirthSkyContinuousSeal size={SEAL_SLOT_SIZES.reveal} slotId="seal-reveal" />
        {vm.daySkyBadge ? (
          <p
            className="mt-4 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold"
            data-testid="birth-sky-day-sky-badge"
          >
            {vm.daySkyBadge}
          </p>
        ) : null}
        <h2
          className="mt-6 font-quicksand text-[1.65rem] font-bold leading-tight tracking-tight"
          data-testid="birth-sky-essence-line"
        >
          {vm.essenceLine}
        </h2>
        <p className="mt-3 text-sm text-[hsl(40_20%_96%/0.65)]">{vm.metaCaption}</p>

        {vm.essenceCard ? (
          <div
            className="mt-8 w-full rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-left"
            data-testid="birth-sky-essence-card"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
              {vm.essenceCard.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed">{vm.essenceCard.body}</p>
          </div>
        ) : null}

        {vm.risingNote ? (
          <p className="mt-4 text-xs text-[hsl(40_20%_96%/0.55)]">{vm.risingNote}</p>
        ) : null}

        <Button
          type="button"
          className="mt-10 min-h-12 w-full rounded-xl"
          disabled={!ctaEnabled}
          aria-disabled={!ctaEnabled}
          onClick={() => {
            trackBirthSkyEvent("birth_sky.dashboard_entered", {
              mode: vm.mode,
              time_precision: profile.timePrecision,
            });
            onEnter();
          }}
          data-testid="birth-sky-reveal-cta"
        >
          Enter Birth Sky
        </Button>
        {!ctaEnabled ? (
          <p className="sr-only" aria-live="polite">
            Enter Birth Sky will be available shortly.
          </p>
        ) : (
          <p className="sr-only" aria-live="polite">
            Enter Birth Sky is available.
          </p>
        )}
      </div>
    </BirthSkyModuleShell>
  );
}
