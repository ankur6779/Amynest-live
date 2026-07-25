/**
 * @deprecated IM-1 temporary seam — replaced by pages/dashboard/dashboard-page.tsx (IM-2).
 * Kept only for export compatibility; not routed.
 */

import { Button } from "@/components/ui/button";
import {
  BirthSkyHorizonSeal,
  BirthSkyModuleShell,
} from "../components/birth-sky-module-shell";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";

export const BIRTH_SKY_DASHBOARD_BOUNDARY_SEAM =
  "im1_temporary_dashboard_boundary" as const;

type Props = {
  childName: string;
  onExit: () => void;
};

export function BirthSkyDashboardBoundaryPage({ childName, onExit }: Props) {
  return (
    <BirthSkyModuleShell
      title={AMY_ASTRO_PRODUCT_NAME}
      onBack={onExit}
      testId="birth-sky-dashboard-boundary"
    >
      <div data-birth-sky-seam={BIRTH_SKY_DASHBOARD_BOUNDARY_SEAM} hidden />
      <div className="flex flex-col items-center pt-8 text-center">
        <BirthSkyHorizonSeal size={96} />
        <h2 className="mt-6 font-quicksand text-2xl font-bold">
          {childName}&apos;s sky is ready
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
          You&apos;ve completed the first Amy Astro Intelligence journey. The full dashboard arrives next.
        </p>
        <Button
          type="button"
          className="mt-8 min-h-12 w-full rounded-xl"
          onClick={onExit}
          data-testid="birth-sky-dashboard-boundary-exit"
        >
          Back to Parenting Hub
        </Button>
      </div>
    </BirthSkyModuleShell>
  );
}
