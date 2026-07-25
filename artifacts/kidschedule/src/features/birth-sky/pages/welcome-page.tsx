/**
 * Welcome Ceremony (Pack 1 Screen 1, Pack 2 Part 1) — IM-0 landing.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  BirthSkyHorizonSeal,
  BirthSkyModuleShell,
} from "../components/birth-sky-module-shell";
import { trackBirthSkyEvent } from "../lib/analytics";

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
    ? `The sky when ${childFirstName} arrived`
    : "The sky when they arrived";

  return (
    <BirthSkyModuleShell title="Birth Sky" onBack={onBack} testId="birth-sky-welcome">
      <div className="flex flex-col items-center pt-4 text-center">
        <BirthSkyHorizonSeal size={112} />
        <h2 className="mt-6 font-quicksand text-[1.75rem] font-bold leading-tight tracking-tight">
          {title}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
          Quiet astronomy for parents — optional, precise, never a prediction.
        </p>

        <ul
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
          aria-label="Trust"
        >
          {TRUST_CHIPS.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-[hsl(40_20%_96%/0.85)]"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>

      <section className="mt-8 space-y-3" aria-labelledby="birth-sky-what-is">
        <h3 id="birth-sky-what-is" className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(40_20%_96%/0.55)]">
          What this is
        </h3>
        {[
          { t: "Sky map", d: "A calm map of the sky from their birth details." },
          { t: "Cultural stories", d: "Optional traditional lens — clearly labeled as tradition." },
          { t: "Parenting reflections", d: "Gentle prompts for parents — not a forecast." },
        ].map((card) => (
          <div
            key={card.t}
            className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-left"
          >
            <p className="text-sm font-bold">{card.t}</p>
            <p className="mt-1 text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">{card.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-2" aria-labelledby="birth-sky-what-isnt">
        <h3 id="birth-sky-what-isnt" className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(40_20%_96%/0.55)]">
          What this isn’t
        </h3>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left text-sm leading-relaxed text-[hsl(40_20%_96%/0.78)]">
          Not fate, not medical advice, and not career or marriage prediction. Birth Sky is
          reflective and optional.
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-3">
        <Button
          type="button"
          className="min-h-12 w-full rounded-xl text-base font-semibold"
          onClick={() => {
            trackBirthSkyEvent("birth_sky.setup_started", { referrer: "parenting_hub" });
            onBegin();
          }}
          data-testid="birth-sky-begin"
        >
          Begin
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 w-full rounded-xl text-[hsl(40_20%_96%/0.8)] hover:bg-white/10 hover:text-[hsl(40_20%_96%)]"
          onClick={onNotNow}
          data-testid="birth-sky-not-now"
        >
          Not now
        </Button>
      </div>
    </BirthSkyModuleShell>
  );
}
