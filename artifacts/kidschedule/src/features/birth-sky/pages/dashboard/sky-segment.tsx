import { useEffect } from "react";
import type { SkyBodyKey, SkySegmentVM } from "../../application/view-models/dashboard-vm";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { BirthSkyMap } from "./sky-map";

type Props = {
  vm: SkySegmentVM;
  selectedBody: SkyBodyKey | null;
  onSelect: (key: SkyBodyKey) => void;
  onSkyInteractive: () => void;
  reducedMotion: boolean;
};

export function BirthSkySkySegment({
  vm,
  selectedBody,
  onSelect,
  onSkyInteractive,
  reducedMotion,
}: Props) {
  useEffect(() => {
    trackBirthSkyEvent("birth_sky.sky_segment_viewed", { mode: vm.mode });
  }, [vm.mode]);

  return (
    <div data-testid="birth-sky-sky-segment" className="space-y-4">
      <BirthSkyMap
        vm={vm}
        selectedBody={selectedBody}
        onSelect={onSelect}
        onInteractive={onSkyInteractive}
        reducedMotion={reducedMotion}
      />
      <div className="space-y-2">
        {vm.cards.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
            data-testid={`birth-sky-sky-card-${card.key}`}
            data-locked={card.locked ? "true" : "false"}
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
              {card.title}
              {card.locked ? " · Locked" : ""}
            </p>
            <p className="mt-1 text-sm text-[hsl(40_20%_96%/0.8)]">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
