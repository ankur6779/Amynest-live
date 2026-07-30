import { useEffect, useState } from "react";
import type { AstronomySegmentVM } from "../../application/view-models/dashboard-vm";
import type { AstronomyData } from "../../domain/models/birth-profile";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { Button } from "@/components/ui/button";
import { BirthSkyChartDetailsPanel } from "../../components/chart-details-panel";

type Props = {
  vm: AstronomySegmentVM;
  astronomy?: AstronomyData;
  onAddTime: () => void;
};

export function BirthSkyAstronomySegment({ vm, astronomy, onAddTime }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.astronomy_segment_viewed", {
      mode: vm.daySky ? "day_sky" : "full",
    });
  }, [vm.daySky]);

  return (
    <div data-testid="birth-sky-astronomy-segment" className="space-y-4">
      <p className="text-sm text-[hsl(40_20%_96%/0.72)]">{vm.intro}</p>

      <div className="space-y-2">
        {vm.cards.map((card) => {
          const open = openId === card.id;
          return (
            <div
              key={card.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
              data-testid={`birth-sky-astro-card-${card.id}`}
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : card.id)}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
                    {card.title}
                    {card.locked ? " · Locked" : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{card.summary}</p>
                </div>
                <span className="text-xs text-[hsl(40_20%_96%/0.55)]">{open ? "Hide" : "More"}</span>
              </button>
              {open ? (
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-[hsl(40_20%_96%/0.78)]">
                  <p>{card.detail}</p>
                  {card.locked && card.lockHint ? (
                    <>
                      <p>{card.lockHint}</p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 rounded-xl"
                        onClick={onAddTime}
                        data-testid="birth-sky-astro-add-time"
                      >
                        Add birth time
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {astronomy ? <BirthSkyChartDetailsPanel astronomy={astronomy} /> : null}

      <section aria-labelledby="birth-sky-seasonal">
        <h3 id="birth-sky-seasonal" className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
          Season of that day
        </h3>
        <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.78)]">{vm.seasonalNote}</p>
      </section>

      <section aria-labelledby="birth-sky-observable">
        <h3 id="birth-sky-observable" className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
          Observable sky
        </h3>
        <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.78)]">{vm.observableNote}</p>
      </section>

      <p className="text-xs text-[hsl(40_20%_96%/0.45)]" data-testid="birth-sky-astro-precision">
        {vm.precisionFooter}
      </p>
    </div>
  );
}
