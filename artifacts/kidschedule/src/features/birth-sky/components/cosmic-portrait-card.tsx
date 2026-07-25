/**
 * My Child's Cosmic Portrait — Signature Edition emotional centerpiece.
 */

import { AmyAstroCosmicPortrait } from "./cosmic-portrait";
import type { CosmicPortraitContent } from "../lib/signature-insight";
import { AMY_ASTRO_DISCLAIMER } from "../lib/branding";
import { cn } from "@/lib/utils";
import "../design/amy-astro.css";

type Props = {
  childName: string;
  portrait: CosmicPortraitContent;
  reducedMotion?: boolean;
  onAskAmy?: () => void;
  onContinue?: () => void;
};

export function AmyAstroCosmicPortraitCard({
  childName,
  portrait,
  reducedMotion = false,
  onAskAmy,
  onContinue,
}: Props) {
  return (
    <section
      className={cn(
        "amy-astro-glass amy-astro-shimmer relative overflow-hidden rounded-[1.75rem] p-5",
        !reducedMotion && "amy-astro-enter",
      )}
      aria-label={`My Child's Cosmic Portrait — ${childName}`}
      data-testid="amy-astro-cosmic-portrait-card"
    >
      <div
        className="pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full bg-[hsl(275_70%_45%/0.18)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-[hsl(42_70%_45%/0.12)] blur-3xl"
        aria-hidden
      />

      <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(42_60%_70%/0.75)]">
        My Child&apos;s Cosmic Portrait
      </p>
      <h2 className="amy-astro-display amy-astro-gold-text relative mt-1 truncate text-2xl leading-tight">
        {childName}
      </h2>

      <div className="relative mt-4">
        <AmyAstroCosmicPortrait childName={childName} reducedMotion={reducedMotion} />
      </div>

      <blockquote
        className="amy-astro-signature relative mt-5 space-y-3 border-l-2 border-[hsl(42_60%_60%/0.45)] pl-4"
        data-testid="amy-astro-signature-insight"
      >
        {portrait.signatureParagraph.split("\n\n").map((block, i) => (
          <p
            key={i}
            className={cn(
              "amy-astro-display whitespace-pre-line text-[hsl(40_22%_96%/0.92)]",
              i === 0 ? "text-lg leading-relaxed" : "text-base leading-relaxed text-[hsl(42_70%_82%/0.95)]",
            )}
          >
            {block}
          </p>
        ))}
      </blockquote>

      <p className="relative mt-4 text-sm leading-relaxed text-[hsl(42_55%_78%/0.9)]">
        {portrait.signatureSentence}
      </p>

      <div className="relative mt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_70%/0.7)]">
          Three defining qualities
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {portrait.qualities.map((q) => (
            <li
              key={q}
              className="rounded-full border border-[hsl(42_50%_60%/0.3)] bg-[hsl(42_40%_25%/0.22)] px-3 py-1.5 text-xs font-medium text-[hsl(42_80%_84%)]"
            >
              {q}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_70%/0.7)]">
          Three parenting reminders
        </p>
        <ul className="mt-2 space-y-2">
          {portrait.parentingReminders.map((r) => (
            <li
              key={r}
              className="flex gap-2 text-sm leading-relaxed text-[hsl(40_18%_94%/0.82)]"
            >
              <span className="text-[hsl(42_70%_70%)]" aria-hidden>
                ✦
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="amy-astro-glass relative mt-5 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_70%/0.7)]">
          Current sky influence
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[hsl(40_18%_94%/0.85)]">
          {portrait.currentSkyInfluence}
        </p>
      </div>

      <div className="relative mt-4 rounded-2xl border border-[hsl(275_40%_60%/0.25)] bg-[hsl(275_40%_20%/0.25)] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(275_50%_78%/0.8)]">
          Amy reflection
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[hsl(40_18%_94%/0.88)]">
          {portrait.amyReflection}
        </p>
      </div>

      <p className="relative mt-3 text-[10px] leading-snug text-[hsl(40_20%_96%/0.4)]">
        {AMY_ASTRO_DISCLAIMER}
      </p>

      <div className="relative mt-4 flex flex-col gap-2 sm:flex-row">
        {onContinue ? (
          <button
            type="button"
            className="amy-astro-ripple min-h-11 flex-1 rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] text-sm font-semibold text-white"
            onClick={onContinue}
            data-testid="amy-astro-portrait-continue"
          >
            Continue your journey →
          </button>
        ) : null}
        {onAskAmy ? (
          <button
            type="button"
            className="amy-astro-ripple min-h-11 flex-1 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-semibold"
            onClick={onAskAmy}
            data-testid="amy-astro-portrait-ask-amy"
          >
            Ask Amy about this portrait
          </button>
        ) : null}
      </div>
    </section>
  );
}
