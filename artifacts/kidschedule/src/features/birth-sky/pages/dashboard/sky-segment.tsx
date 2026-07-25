import { useEffect } from "react";
import type { SkyBodyKey, SkySegmentVM } from "../../application/view-models/dashboard-vm";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { BirthSkyMap } from "./sky-map";
import { AmyAstroInsightsPanel } from "./insights-panel";
import {
  AmyAstroCosmicTimeline,
  buildDefaultCosmicTimeline,
} from "../../components/cosmic-timeline";
import { cn } from "@/lib/utils";
import "../../design/amy-astro.css";

type Props = {
  vm: SkySegmentVM;
  selectedBody: SkyBodyKey | null;
  onSelect: (key: SkyBodyKey) => void;
  onSkyInteractive: () => void;
  reducedMotion: boolean;
  childName: string;
  sunSign: string;
  moonSign: string;
  risingSign: string | null;
  moonPhaseLabel: string;
  onInsightOpened?: (chapterId: string) => void;
  focusChapterId?: string | null;
};

const BODY_GLOW: Record<SkyBodyKey, string> = {
  sun: "from-[hsl(42_80%_45%/0.35)] to-[hsl(20_70%_35%/0.2)]",
  moon: "from-[hsl(220_50%_55%/0.3)] to-[hsl(275_40%_40%/0.2)]",
  rising: "from-[hsl(275_55%_45%/0.3)] to-[hsl(42_50%_35%/0.15)]",
};

export function BirthSkySkySegment({
  vm,
  selectedBody,
  onSelect,
  onSkyInteractive,
  reducedMotion,
  childName,
  sunSign,
  moonSign,
  risingSign,
  moonPhaseLabel,
  onInsightOpened,
  focusChapterId,
}: Props) {
  useEffect(() => {
    trackBirthSkyEvent("birth_sky.sky_segment_viewed", { mode: vm.mode });
  }, [vm.mode]);

  const timeline = buildDefaultCosmicTimeline({
    childName,
    moonPhaseLabel,
    sunSign,
    daySky: vm.mode === "day_sky",
  });

  return (
    <div data-testid="birth-sky-sky-segment" className="space-y-5">
      <div
        className={cn(
          "amy-astro-glass amy-astro-breathe rounded-3xl p-3",
          !reducedMotion && "amy-astro-enter",
        )}
      >
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.7)]">
          Live sky
        </p>
        <BirthSkyMap
          vm={vm}
          selectedBody={selectedBody}
          onSelect={onSelect}
          onInteractive={onSkyInteractive}
          reducedMotion={reducedMotion}
        />
      </div>

      <div className="grid gap-3">
        {vm.cards.map((card, idx) => (
          <button
            key={card.key}
            type="button"
            disabled={card.locked}
            onClick={() => {
              if (!card.locked) onSelect(card.key);
            }}
            className={cn(
              "amy-astro-glass amy-astro-breathe rounded-2xl border px-4 py-4 text-left",
              `bg-gradient-to-br ${BODY_GLOW[card.key]}`,
              selectedBody === card.key && "ring-1 ring-[hsl(42_70%_65%/0.55)]",
              card.locked && "opacity-60",
              !reducedMotion && "amy-astro-enter",
              !reducedMotion && idx === 1 && "amy-astro-enter-delay-1",
              !reducedMotion && idx === 2 && "amy-astro-enter-delay-2",
            )}
            data-testid={`birth-sky-sky-card-${card.key}`}
            data-locked={card.locked ? "true" : "false"}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_75%/0.75)]">
              {card.title}
              {card.locked ? " · Locked" : ""}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[hsl(40_20%_96%/0.88)]">
              {card.body}
            </p>
          </button>
        ))}
      </div>

      <AmyAstroCosmicTimeline points={timeline} reducedMotion={reducedMotion} />

      <AmyAstroInsightsPanel
        childName={childName}
        sunSign={sunSign}
        moonSign={moonSign}
        risingSign={risingSign}
        moonPhaseLabel={moonPhaseLabel}
        daySky={vm.mode === "day_sky"}
        reducedMotion={reducedMotion}
        onChapterOpen={onInsightOpened}
        focusChapterId={focusChapterId}
      />
    </div>
  );
}
