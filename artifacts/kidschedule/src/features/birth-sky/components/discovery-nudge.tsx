/**
 * Gentle discovery guidance — never pushy.
 */

import type { DiscoveryNudge } from "../lib/discovery-guidance";
import { cn } from "@/lib/utils";
import "../design/amy-astro.css";

type Props = {
  nudge: DiscoveryNudge;
  continuityLine: string | null;
  reducedMotion?: boolean;
  onFollow: (nudge: DiscoveryNudge) => void;
};

export function AmyAstroDiscoveryNudge({
  nudge,
  continuityLine,
  reducedMotion = false,
  onFollow,
}: Props) {
  return (
    <section
      className={cn(
        "amy-astro-glass rounded-3xl p-4",
        !reducedMotion && "amy-astro-enter amy-astro-enter-delay-2",
      )}
      data-testid="amy-astro-discovery-nudge"
    >
      {continuityLine ? (
        <p
          className="mb-3 text-sm leading-relaxed text-[hsl(42_55%_78%/0.9)]"
          data-testid="amy-astro-continuity-line"
        >
          {continuityLine}
        </p>
      ) : null}
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(42_60%_70%/0.7)]">
        Gentle guidance
      </p>
      <p className="amy-astro-display mt-2 text-lg leading-snug text-[hsl(40_22%_96%/0.92)]">
        {nudge.line}
      </p>
      {nudge.action !== "wander" ? (
        <button
          type="button"
          className="amy-astro-ripple mt-3 min-h-11 rounded-xl border border-[hsl(42_50%_60%/0.35)] bg-[hsl(42_40%_25%/0.2)] px-4 text-sm font-semibold text-[hsl(42_80%_84%)]"
          onClick={() => onFollow(nudge)}
          data-testid="amy-astro-discovery-follow"
        >
          Show me gently →
        </button>
      ) : null}
    </section>
  );
}
