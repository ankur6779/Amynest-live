/**
 * Cosmic timeline — Birth → Current → Next Moon → Season → Birthday → Anniversary.
 */

import { cn } from "@/lib/utils";
import "../design/amy-astro.css";

export type CosmicTimelinePoint = {
  id: string;
  label: string;
  caption: string;
  active?: boolean;
};

type Props = {
  points: CosmicTimelinePoint[];
  reducedMotion?: boolean;
  className?: string;
};

export function AmyAstroCosmicTimeline({
  points,
  reducedMotion = false,
  className,
}: Props) {
  return (
    <section
      className={cn("amy-astro-glass amy-astro-enter rounded-3xl p-4", className)}
      data-testid="amy-astro-cosmic-timeline"
      aria-label="Cosmic timeline"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.75)]">
        Cosmic timeline
      </p>
      <h3 className="amy-astro-display mt-1 text-lg text-[hsl(42_70%_78%)]">
        Skies that belong to them
      </h3>

      <ol className="relative mt-5 space-y-0">
        <div
          className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-[hsl(42_70%_60%/0.6)] via-[hsl(275_50%_55%/0.35)] to-transparent"
          aria-hidden
        />
        {points.map((p, i) => (
          <li
            key={p.id}
            className={cn(
              "relative flex gap-3 pb-5 last:pb-0",
              !reducedMotion && "amy-astro-enter",
              !reducedMotion && i === 1 && "amy-astro-enter-delay-1",
              !reducedMotion && i === 2 && "amy-astro-enter-delay-2",
            )}
            data-testid={`amy-astro-timeline-${p.id}`}
          >
            <span
              className={cn(
                "relative z-[1] mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                p.active
                  ? "border-[hsl(42_70%_65%)] bg-[hsl(42_50%_30%/0.45)] text-[hsl(42_90%_85%)] shadow-[0_0_16px_hsl(42_80%_50%/0.35)]"
                  : "border-white/20 bg-black/40 text-[hsl(40_20%_96%/0.55)]",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-[hsl(40_20%_96%/0.95)]">{p.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[hsl(40_20%_96%/0.58)]">
                {p.caption}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function buildDefaultCosmicTimeline(input: {
  childName: string;
  moonPhaseLabel: string;
  sunSign: string;
  daySky: boolean;
}): CosmicTimelinePoint[] {
  const { childName, moonPhaseLabel, sunSign, daySky } = input;
  return [
    {
      id: "birth",
      label: "Birth Sky",
      caption: `The sky when ${childName} arrived — ${moonPhaseLabel} light, ${sunSign} daylight.`,
      active: true,
    },
    {
      id: "current",
      label: "Current Sky",
      caption: "Tonight’s living sky — a reminder that wonder renews every evening.",
    },
    {
      id: "next-moon",
      label: "Next Moon",
      caption: "A soft invitation to notice the next lunar chapter together.",
    },
    {
      id: "seasonal",
      label: "Seasonal Sky",
      caption: "How the season’s light frames ordinary days at home.",
    },
    {
      id: "birthday",
      label: "Birthday Sky",
      caption: "Each year, the Sun returns near their birth daylight — a gentle anniversary of light.",
    },
    {
      id: "anniversary",
      label: "Sky Anniversary",
      caption: daySky
        ? "Day Sky families can still celebrate the civil day with ritual and gratitude."
        : "Mark the moment with a story, not a prediction.",
    },
  ];
}
