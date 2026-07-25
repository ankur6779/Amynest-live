/**
 * Flag-off / unavailable recovery (Pack 1 Part 10).
 */

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "./birth-sky-module-shell";
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
        <Sparkles className="h-10 w-10 text-[hsl(40_30%_70%)]" aria-hidden />
        <h2 className="mt-4 font-quicksand text-2xl font-bold">
          {AMY_ASTRO_PRODUCT_NAME} is unavailable
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
          {reason === "deep_links_off"
            ? "Deep links into Birth Sky are turned off right now."
            : "This optional module is turned off right now."}
        </p>
        <Button
          type="button"
          className="mt-8 min-h-12 rounded-xl px-8"
          onClick={onExit}
          data-testid="birth-sky-unavailable-exit"
        >
          Back to Parenting Hub
        </Button>
      </div>
    </BirthSkyModuleShell>
  );
}
