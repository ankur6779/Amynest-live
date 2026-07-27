/**
 * Day Sky affirming banner (Pack 4 Part 7). Never shame unknown birth time.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trackBirthSkyEvent } from "../../lib/analytics";

type Props = {
  visible: boolean;
  alreadyViewed: boolean;
  onViewed: () => void;
  onAddTime: () => void;
};

export function BirthSkyDaySkyBanner({
  visible,
  alreadyViewed,
  onViewed,
  onAddTime,
}: Props) {
  useEffect(() => {
    if (!visible || alreadyViewed) return;
    trackBirthSkyEvent("birth_sky.day_sky_banner_viewed", {
      mode: "day_sky",
      time_precision: "unknown",
    });
    onViewed();
  }, [visible, alreadyViewed, onViewed]);

  if (!visible) return null;

  return (
    <div
      className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-left"
      role="status"
      data-testid="birth-sky-day-sky-banner"
    >
      <p className="text-sm font-semibold text-[hsl(40_20%_96%/0.92)]">
        Day Sky · still meaningful
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
        Without an exact time we map the sky of that day. Time unlocks rising and houses —
        optional, whenever you&apos;re ready.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="amy-astro-btn-secondary mt-3 min-h-11 rounded-xl"
        onClick={onAddTime}
        data-testid="birth-sky-day-sky-add-time"
      >
        Add birth time
      </Button>
    </div>
  );
}
