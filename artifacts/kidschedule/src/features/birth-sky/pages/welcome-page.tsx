/**
 * Welcome — Amy Astro Intelligence cinematic landing (WOW in 5s).
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../components/birth-sky-module-shell";
import { AmyAstroEmblem } from "../components/amy-astro-emblem";
import { trackBirthSkyEvent } from "../lib/analytics";
import {
  AMY_ASTRO_DISCLAIMER,
  AMY_ASTRO_PRODUCT_NAME,
  AMY_ASTRO_SUBLINE,
  AMY_ASTRO_TAGLINE,
} from "../lib/branding";
import "../design/amy-astro.css";

type WelcomePageProps = {
  childFirstName?: string;
  onBegin: () => void;
  onNotNow: () => void;
  onBack: () => void;
};

const TRUST_CHIPS = ["Precise", "Optional", "Parent-only", "Not a prediction"] as const;

export function BirthSkyWelcomePage({
  childFirstName,
  onBegin,
  onNotNow,
  onBack,
}: WelcomePageProps) {
  useEffect(() => {
    trackBirthSkyEvent("birth_sky.welcome_viewed", { referrer: "parenting_hub" });
  }, []);

  const title = childFirstName
    ? `${childFirstName}'s cosmic blueprint`
    : "Your child's cosmic blueprint";

  return (
    <BirthSkyModuleShell
      title={AMY_ASTRO_PRODUCT_NAME}
      onBack={onBack}
      testId="birth-sky-welcome"
      ambientIntensity="full"
    >
      <div className="amy-astro-enter flex flex-col items-center pt-2 text-center">
        <AmyAstroEmblem size={168} />
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-[hsl(42_60%_70%/0.75)]">
          {AMY_ASTRO_PRODUCT_NAME}
        </p>
        <h2 className="amy-astro-display amy-astro-gold-text amy-astro-hero-title mt-2 max-w-full px-2 text-[clamp(1.35rem,5.6vw,1.85rem)] font-semibold leading-snug">
          {title}
        </h2>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[hsl(40_20%_96%/0.45)]">
          {AMY_ASTRO_TAGLINE}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
          {AMY_ASTRO_SUBLINE}
        </p>

        <ul
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
          aria-label="Trust"
        >
          {TRUST_CHIPS.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-[hsl(42_50%_60%/0.28)] bg-white/5 px-3 py-1 text-xs font-semibold text-[hsl(40_20%_96%/0.85)]"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>

      <section className="mt-8 space-y-3" aria-labelledby="amy-astro-what-is">
        <h3
          id="amy-astro-what-is"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.65)]"
        >
          Inside the experience
        </h3>
        {[
          {
            t: "Immersive sky",
            d: "A living map of the sky from their birth details — motion, depth, calm wonder.",
          },
          {
            t: "Kundli & deep insights",
            d: "Animated chart literacy plus long-form intelligence — clearly labeled, never fate.",
          },
          {
            t: "Ask Amy About Their Sky",
            d: "A trusted guide who already knows this sky — reflective counsel for parents, never fate.",
          },
        ].map((card, i) => (
          <div
            key={card.t}
            className={`amy-astro-glass amy-astro-card amy-astro-enter rounded-2xl text-left ${i === 1 ? "amy-astro-enter-delay-1" : ""} ${i === 2 ? "amy-astro-enter-delay-2" : ""}`}
          >
            <p className="text-sm font-bold text-[hsl(42_70%_78%)]">{card.t}</p>
            <p className="mt-1 text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">{card.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-2" aria-labelledby="amy-astro-what-isnt">
        <h3
          id="amy-astro-what-isnt"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.65)]"
        >
          What this isn’t
        </h3>
        <div className="amy-astro-glass amy-astro-card rounded-2xl text-left text-sm leading-relaxed text-[hsl(40_20%_96%/0.78)]">
          Not fate, not medical advice, and not career or marriage prediction.{" "}
          {AMY_ASTRO_DISCLAIMER}
        </div>
      </section>

      <div className="amy-astro-cta-stack mt-10 flex flex-col items-stretch gap-4">
        <Button
          type="button"
          className="amy-astro-btn-premium relative z-[1] min-h-12 w-full rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] text-base font-semibold text-white shadow-[0_0_28px_hsl(275_70%_40%/0.35)]"
          onClick={() => {
            trackBirthSkyEvent("birth_sky.setup_started", { referrer: "parenting_hub" });
            onBegin();
          }}
          data-testid="birth-sky-begin"
        >
          Begin the journey
        </Button>
        <button
          type="button"
          className="amy-astro-btn-text relative z-0 min-h-11 w-full rounded-xl px-3 text-sm font-medium text-[hsl(40_20%_96%/0.78)] transition-colors hover:bg-white/[0.06] hover:text-[hsl(40_20%_96%/0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(42_70%_65%/0.55)]"
          onClick={onNotNow}
          data-testid="birth-sky-not-now"
        >
          Not now
        </button>
      </div>
    </BirthSkyModuleShell>
  );
}
