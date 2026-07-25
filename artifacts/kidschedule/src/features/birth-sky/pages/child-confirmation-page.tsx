/**
 * Child Confirmation (Pack 2 Part 2) — IM-0 navigation ownership.
 * Continue advances only to setup/date; date+ persistence is IM-1.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../components/birth-sky-module-shell";
import { trackBirthSkyEvent } from "../lib/analytics";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";

export type BirthSkyChildOption = {
  id: number;
  name: string;
  dob?: string | null;
};

type ChildConfirmationPageProps = {
  child: BirthSkyChildOption | null;
  childrenList: BirthSkyChildOption[];
  onContinue: (childId: number) => void;
  onSwitchChild: (childId: number) => void;
  onBack: () => void;
  /** When true, Continue is shown but setup beyond child is IM-1. */
  continueEnabled: boolean;
};

export function BirthSkyChildConfirmationPage({
  child,
  childrenList,
  onContinue,
  onSwitchChild,
  onBack,
  continueEnabled,
}: ChildConfirmationPageProps) {
  useEffect(() => {
    trackBirthSkyEvent("birth_sky.setup_step_viewed", { setup_step: "child" });
  }, []);

  if (!child) {
    return (
      <BirthSkyModuleShell title={AMY_ASTRO_PRODUCT_NAME} onBack={onBack} testId="birth-sky-no-child">
        <div className="py-12 text-center">
          <h2 className="font-quicksand text-xl font-bold">Choose a child to open Amy Astro Intelligence</h2>
          <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">
            Add or select a child in AmyNest, then return here.
          </p>
          <Button
            type="button"
            className="mt-8 min-h-12 rounded-xl"
            onClick={onBack}
            data-testid="birth-sky-no-child-exit"
          >
            Back to Parenting Hub
          </Button>
        </div>
      </BirthSkyModuleShell>
    );
  }

  return (
    <BirthSkyModuleShell title={AMY_ASTRO_PRODUCT_NAME} onBack={onBack} testId="birth-sky-child-confirmation">
      <h2 className="font-quicksand text-2xl font-bold">Whose Amy Astro Intelligence?</h2>
      <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">
        We’ll use this child’s profile. You can switch before continuing.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
          Selected
        </p>
        <p className="mt-2 font-quicksand text-xl font-bold">{child.name}</p>
        {child.dob ? (
          <p className="mt-1 text-sm text-[hsl(40_20%_96%/0.65)]">Date on file: {child.dob}</p>
        ) : null}
      </div>

      {childrenList.length > 1 ? (
        <div className="mt-4 space-y-2" role="list" aria-label="Switch child">
          {childrenList.map((c) => (
            <button
              key={c.id}
              type="button"
              role="listitem"
              onClick={() => onSwitchChild(c.id)}
              className={`flex min-h-12 w-full items-center rounded-xl border px-4 text-left text-sm font-semibold ${
                c.id === child.id
                  ? "border-[hsl(40_30%_70%/0.5)] bg-white/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
              data-testid={`birth-sky-switch-child-${c.id}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        className="mt-8 min-h-12 w-full rounded-xl text-base font-semibold"
        disabled={!continueEnabled}
        onClick={() => onContinue(child.id)}
        data-testid="birth-sky-child-continue"
      >
        Continue with {child.name}
      </Button>
    </BirthSkyModuleShell>
  );
}
