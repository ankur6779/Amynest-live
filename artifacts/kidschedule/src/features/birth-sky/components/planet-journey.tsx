/**
 * Planet stories — premium illustrated chapters for Sun / Moon / Rising.
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { AmyAstroCosmicAmbient } from "./cosmic-ambient";
import { useFocusTrap } from "../lib/focus-trap";
import { AMY_ASTRO_DISCLAIMER } from "../lib/branding";
import "../design/amy-astro.css";

export type PlanetKey = "sun" | "moon" | "rising";

type Props = {
  planet: PlanetKey;
  childName: string;
  sign: string;
  locked?: boolean;
  moonPhaseLabel?: string;
  reducedMotion?: boolean;
  relatedChapterHint?: string;
  onClose: () => void;
  onExploreChapter?: () => void;
  onAskAmy?: () => void;
};

const JOURNEY: Record<
  PlanetKey,
  {
    title: string;
    glyph: string;
    glow: string;
    meaning: (sign: string, child: string, phase?: string) => string;
    notice: (child: string) => string;
    support: (child: string) => string;
    examples: string[];
  }
> = {
  sun: {
    title: "Sun story",
    glyph: "☀",
    glow: "from-[hsl(42_80%_40%/0.55)] to-[hsl(20_60%_25%/0.35)]",
    meaning: (sign, child) =>
      `You may notice ${child}'s daylight themes glowing through ${sign} — vitality, creative heat, the quiet pride of being gently seen. A noticing lens, never a fixed label.`,
    notice: (child) =>
      `Parents often notice ${child} brightening when effort is witnessed without comparison — a drawing shown twice, a wobble followed by another try.`,
    support: (child) =>
      `Offer ${child} small stages where process is celebrated before product. Let enthusiasm lead; guide the soft landing.`,
    examples: [
      "Lighting up when their idea is named aloud",
      "Trying again after a wobble",
      "Wanting a tiny audience of one trusted adult",
    ],
  },
  moon: {
    title: "Moon story",
    glyph: "☾",
    glow: "from-[hsl(220_55%_45%/0.5)] to-[hsl(275_45%_30%/0.35)]",
    meaning: (sign, child, phase) =>
      `Your child's emotional world is illuminated by a ${(phase ?? "soft").toLowerCase()} Moon resting in ${sign}, suggesting comfort often grows through belonging and rhythm.`,
    notice: (child) =>
      `You may notice ${child}'s feelings arrive like weather — needing a familiar song, softening near one trusted person, then passing when the room feels safe.`,
    support: (child) =>
      `Protect soft landings for ${child}: predictable goodnights, fewer abrupt exits, repair after storms without hurry.`,
    examples: [
      "Needing a familiar song after a big day",
      "Softening near one trusted adult",
      "Feelings that crest, then ease",
    ],
  },
  rising: {
    title: "Rising story",
    glyph: "↗",
    glow: "from-[hsl(275_55%_42%/0.5)] to-[hsl(42_45%_28%/0.3)]",
    meaning: (sign, child) =>
      sign === "—" || !sign
        ? `Rising waits for birth time. ${child}'s Day Sky remains complete and beautiful without it — no pressure to unlock a doorway.`
        : `As ${child} meets a room, Rising ${sign} can feel like a soft doorway — how others may first greet them. Measured astronomy, offered for reflection.`,
    notice: (child) =>
      `Parents may notice ${child} warming up before joining — watching first, then stepping in when trust arrives.`,
    support: (child) =>
      `Give ${child} unhurried first minutes in new spaces. A doorway works best when nobody rushes the entrance.`,
    examples: [
      "Warming up before joining a group",
      "Watching first, then stepping in",
      "A first impression that softens with trust",
    ],
  },
};

export function AmyAstroPlanetJourney({
  planet,
  childName,
  sign,
  locked,
  moonPhaseLabel,
  reducedMotion = false,
  relatedChapterHint,
  onClose,
  onExploreChapter,
  onAskAmy,
}: Props) {
  const j = JOURNEY[planet];
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef, true, onClose);

  return (
    <div
      ref={rootRef}
      className="amy-astro-root fixed inset-0 z-[58] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={j.title}
      data-testid="amy-astro-planet-journey"
      data-planet={planet}
      tabIndex={-1}
    >
      <AmyAstroCosmicAmbient
        reducedMotion={reducedMotion}
        living
        intensity="full"
        showMeteor={!reducedMotion}
      />
      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-y-auto px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)]",
          !reducedMotion && "amy-astro-enter",
        )}
      >
        <button
          type="button"
          className="self-end min-h-11 rounded-full border border-white/20 bg-black/35 px-4 text-xs font-semibold"
          onClick={onClose}
          data-testid="amy-astro-planet-journey-close"
        >
          Close
        </button>

        <div
          className={cn(
            "amy-astro-glass amy-astro-breathe mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br p-6",
            j.glow,
            !reducedMotion && "amy-astro-pulse-glow",
          )}
        >
          <div
            className={cn(
              "mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-[hsl(42_60%_70%/0.45)] bg-black/35 text-5xl shadow-[0_0_40px_hsl(42_70%_50%/0.25)]",
              !reducedMotion && "amy-astro-float",
            )}
            aria-hidden
          >
            {j.glyph}
          </div>
          <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(42_60%_75%/0.75)]">
            {j.title}
          </p>
          <h2 className="amy-astro-display amy-astro-gold-text mt-2 text-center text-3xl">
            {locked ? "Waiting softly" : sign}
          </h2>
          {moonPhaseLabel && planet === "moon" ? (
            <p className="mt-1 text-center text-xs text-[hsl(40_20%_96%/0.55)]">
              {moonPhaseLabel}
            </p>
          ) : null}
        </div>

        <StoryBlock title="Meaning" body={j.meaning(sign, childName, moonPhaseLabel)} />
        <StoryBlock title="What parents may notice" body={j.notice(childName)} />
        <section className="amy-astro-glass mt-3 rounded-3xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_70%/0.7)]">
            Tiny scenes
          </p>
          <ul className="mt-2 space-y-2 text-sm text-[hsl(40_18%_94%/0.82)]">
            {j.examples.map((ex) => (
              <li key={ex} className="flex gap-2">
                <span className="text-[hsl(42_70%_70%)]" aria-hidden>
                  ·
                </span>
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        </section>
        <StoryBlock title="How to support" body={j.support(childName)} />
        {relatedChapterHint ? (
          <p className="mt-3 px-1 text-xs text-[hsl(42_60%_75%/0.85)]">
            Related insight · {relatedChapterHint}
          </p>
        ) : null}

        <p className="mt-4 px-1 text-[10px] leading-snug text-[hsl(40_20%_96%/0.4)]">
          {AMY_ASTRO_DISCLAIMER}
        </p>

        <div className="mt-5 flex flex-col gap-2 pb-[env(safe-area-inset-bottom,0px)]">
          {onExploreChapter ? (
            <button
              type="button"
              className="min-h-12 rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] text-sm font-semibold text-white"
              onClick={onExploreChapter}
            >
              Continue exploring →
            </button>
          ) : null}
          {onAskAmy ? (
            <button
              type="button"
              className="min-h-12 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold"
              onClick={onAskAmy}
            >
              Ask Amy about this light
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StoryBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="amy-astro-glass mt-3 rounded-3xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_70%/0.7)]">
        {title}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-[hsl(40_18%_94%/0.88)]">{body}</p>
    </section>
  );
}
