/**
 * Today's visit — birth chart, tradition, and reflection clearly separated.
 */

import type { TodaysSkyContent } from "../lib/todays-sky";
import { cn } from "@/lib/utils";
import "../design/amy-astro.css";

type Props = {
  content: TodaysSkyContent;
  reducedMotion?: boolean;
};

export function AmyAstroTodaysSkyCard({ content, reducedMotion = false }: Props) {
  return (
    <section
      className={cn(
        "amy-astro-glass amy-astro-breathe rounded-[1.75rem] p-5",
        !reducedMotion && "amy-astro-enter amy-astro-enter-delay-1",
      )}
      data-testid="amy-astro-todays-sky"
      aria-label={content.title}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(42_60%_70%/0.75)]">
        {content.title}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="amy-astro-display text-2xl text-[hsl(42_75%_80%)]">
            Birth Moon · {content.moonPhase}
          </p>
          <p className="mt-1 text-sm text-[hsl(40_20%_96%/0.65)]">
            Visit mood · {content.skyMood}
          </p>
        </div>
        <span className="rounded-full border border-[hsl(42_50%_60%/0.3)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(42_80%_82%)]">
          Not live sky
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-[hsl(42_50%_60%/0.2)] bg-black/20 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_70%/0.7)]">
          Reflection prompt
        </p>
        <p className="amy-astro-display mt-2 text-lg leading-snug text-[hsl(40_22%_96%/0.92)]">
          {content.reflectionPrompt}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[hsl(42_55%_78%/0.9)]">
          {content.parentingSuggestion}
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        <Layer label="Birth chart (astronomy)" tone="gold" body={content.astronomyNote} />
        <Layer label="Traditional interpretation" tone="violet" body={content.traditionNote} />
        <Layer label="Birth chart reminder" tone="soft" body={content.birthChartNote} />
        <Layer label="Reflection" tone="soft" body={content.reflectionNote} />
      </div>
    </section>
  );
}

function Layer({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: "gold" | "violet" | "soft";
}) {
  const border =
    tone === "gold"
      ? "border-[hsl(42_50%_60%/0.28)]"
      : tone === "violet"
        ? "border-[hsl(275_40%_60%/0.28)]"
        : "border-white/12";
  return (
    <div className={cn("rounded-xl border bg-white/[0.03] px-3.5 py-3", border)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.5)]">
        {label}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-[hsl(40_18%_94%/0.78)]">{body}</p>
    </div>
  );
}
