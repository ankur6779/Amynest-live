/**
 * Reveal — cinematic ceremony then premium essence landing.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../components/birth-sky-module-shell";
import {
  BirthSkyContinuousSeal,
  SEAL_SLOT_SIZES,
} from "../components/birth-sky-seal-host";
import { AmyAstroCinematicRevealCeremony } from "../components/cinematic-reveal-ceremony";
import { REVEAL_CTA_ENABLE_MS } from "../constants/formation";
import { buildRevealViewModel } from "../application/view-models/reveal-vm";
import type { BirthProfile, SkySnapshot } from "../domain/models/birth-profile";
import { trackBirthSkyEvent } from "../lib/analytics";
import { AMY_ASTRO_PRODUCT_NAME, AMY_ASTRO_TAGLINE } from "../lib/branding";
import { playSkySound } from "../lib/sky-sounds";
import { loadPreferences } from "../infrastructure/repositories/settings-store";
import "../design/amy-astro.css";

type Props = {
  profile: BirthProfile;
  snapshot: SkySnapshot;
  childName: string;
  onEnter: () => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BirthSkyRevealPage({ profile, snapshot, childName, onEnter }: Props) {
  const vm = buildRevealViewModel(profile, snapshot, childName);
  const [ceremonyDone, setCeremonyDone] = useState(false);
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const reduced = prefersReducedMotion();

  const finishCeremony = useCallback(() => {
    setCeremonyDone(true);
    const prefs = loadPreferences(profile.userId);
    playSkySound("reveal", { enabled: prefs.skySounds, reducedMotion: reduced });
  }, [profile.userId, reduced]);

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
  }, [vm.mode, profile.timePrecision, profile.birthPlace]);

  useEffect(() => {
    if (!ceremonyDone) return;
    const tid = window.setTimeout(() => setCtaEnabled(true), REVEAL_CTA_ENABLE_MS);
    return () => window.clearTimeout(tid);
  }, [ceremonyDone]);

  return (
    <>
      {!ceremonyDone ? (
        <AmyAstroCinematicRevealCeremony
          profileId={profile.profileId}
          childName={childName}
          tagline={AMY_ASTRO_TAGLINE}
          reducedMotion={reduced}
          onComplete={finishCeremony}
        />
      ) : null}

      <BirthSkyModuleShell
        title={AMY_ASTRO_PRODUCT_NAME}
        hideTopBar
        testId="birth-sky-reveal"
        ambientIntensity="full"
        className={ceremonyDone ? "amy-astro-enter" : "opacity-0 pointer-events-none"}
      >
        <div className="flex flex-col items-center pt-10 text-center">
          <BirthSkyContinuousSeal size={SEAL_SLOT_SIZES.reveal} slotId="seal-reveal" />
          {vm.daySkyBadge ? (
            <p
              className="mt-4 rounded-full border border-[hsl(42_50%_60%/0.3)] px-3 py-1 text-xs font-semibold text-[hsl(42_70%_78%)]"
              data-testid="birth-sky-day-sky-badge"
            >
              {vm.daySkyBadge}
            </p>
          ) : null}
          <h2
            className="amy-astro-display amy-astro-gold-text amy-astro-hero-title mt-6 px-1 text-[clamp(1.25rem,5vw,1.65rem)] font-semibold leading-snug"
            data-testid="birth-sky-essence-line"
          >
            {vm.essenceLine}
          </h2>
          <p className="mt-3 text-sm text-[hsl(40_20%_96%/0.65)]">{vm.metaCaption}</p>

          {vm.essenceCard ? (
            <div
              className="amy-astro-glass amy-astro-breathe mt-8 w-full rounded-3xl p-5 text-left"
              data-testid="birth-sky-essence-card"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(42_60%_70%/0.7)]">
                {vm.essenceCard.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[hsl(40_18%_94%/0.88)]">
                {vm.essenceCard.body}
              </p>
            </div>
          ) : null}

          {vm.risingNote ? (
            <p className="mt-4 text-xs text-[hsl(40_20%_96%/0.55)]">{vm.risingNote}</p>
          ) : null}

          <Button
            type="button"
            className="mt-10 min-h-12 w-full rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] text-base font-semibold shadow-[0_0_28px_hsl(275_70%_40%/0.35)]"
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
            Enter the living sky
          </Button>
          {!ctaEnabled ? (
            <p className="sr-only" aria-live="polite">
              Enter will be available shortly.
            </p>
          ) : (
            <p className="sr-only" aria-live="polite">
              Enter is available.
            </p>
          )}
        </div>
      </BirthSkyModuleShell>
    </>
  );
}
