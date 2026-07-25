/**
 * Flag-off / unavailable recovery (Pack 1 Part 10).
 */

import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "./birth-sky-module-shell";
import { AmyAstroEmblem } from "./amy-astro-emblem";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";

type BirthSkyUnavailableProps = {
  onExit: () => void;
  reason?: "flag_off" | "deep_links_off";
};

export function BirthSkyUnavailable({
  onExit,
  reason = "flag_off",
}: BirthSkyUnavailableProps) {
  return (
    <BirthSkyModuleShell title={AMY_ASTRO_PRODUCT_NAME} onBack={onExit} testId="birth-sky-unavailable">
      <div className="flex flex-col items-center px-2 py-16 text-center">
        <AmyAstroEmblem size={88} interactive={false} />
        <h2 className="amy-astro-display mt-4 text-2xl font-bold text-[hsl(42_70%_78%)]">
          {AMY_ASTRO_PRODUCT_NAME} is unavailable
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
          {reason === "deep_links_off"
            ? "Deep links into Amy Astro Intelligence are turned off right now."
            : "This optional module is turned off right now."}
        </p>
        <Button
          type="button"
          className="amy-astro-btn-premium mt-8 min-h-12 rounded-xl px-8"
          onClick={onExit}
          data-testid="birth-sky-unavailable-exit"
        >
          Back to Parenting Hub
        </Button>
      </div>
    </BirthSkyModuleShell>
  );
}
