/**
 * Dashboard Hero (Pack 4 Part 2). Snapshot-driven; Seal via continuous host.
 */

import { useEffect, useRef } from "react";
import {
  BirthSkyContinuousSeal,
  SEAL_SLOT_SIZES,
} from "../../components/birth-sky-seal-host";
import type { CompletenessChip, DashboardHeroVM } from "../../application/view-models/dashboard-vm";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { cn } from "@/lib/utils";

type Props = {
  vm: DashboardHeroVM;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onChip: (chip: CompletenessChip) => void;
  onRegenerateEntry: () => void;
  onHeroPainted: () => void;
  reducedMotion: boolean;
};

export function BirthSkyDashboardHero({
  vm,
  collapsed,
  onToggleCollapse,
  onChip,
  onRegenerateEntry,
  onHeroPainted,
  reducedMotion,
}: Props) {
  const painted = useRef(false);

  useEffect(() => {
    if (painted.current) return;
    painted.current = true;
    const id = window.requestAnimationFrame(() => {
      trackBirthSkyEvent("birth_sky.hero_rendered", {
        mode: vm.mode,
        time_precision: vm.daySky ? "unknown" : "exact",
      });
      onHeroPainted();
    });
    return () => window.cancelAnimationFrame(id);
  }, [onHeroPainted, vm.mode, vm.daySky]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4",
        collapsed ? "py-3" : "py-5",
      )}
      aria-label="Birth Sky hero"
      data-testid="birth-sky-dashboard-hero"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
      >
        <BirthSkyContinuousSeal
          size={collapsed ? SEAL_SLOT_SIZES.heroCompact : SEAL_SLOT_SIZES.hero}
          compact={collapsed}
          slotId="seal-hero"
          className={reducedMotion ? "opacity-90" : undefined}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
            Birth Sky
          </p>
          <h2 className="mt-1 font-quicksand text-xl font-bold tracking-tight">
            {vm.childName}
          </h2>
          {!collapsed ? (
            <>
              <p
                className="mt-2 text-sm font-semibold leading-snug text-[hsl(40_20%_96%/0.9)]"
                data-testid="birth-sky-hero-essence"
              >
                {vm.essenceLine}
              </p>
              <p className="mt-2 truncate text-xs text-[hsl(40_20%_96%/0.6)]">
                {vm.metaCaption}
              </p>
              <p className="mt-2 text-[11px] text-[hsl(40_20%_96%/0.45)]" data-testid="birth-sky-hero-versions">
                Formed {vm.computedAtLabel}
                <span className="mx-1">·</span>
                {vm.snapshotVersion}
                <span className="mx-1">·</span>
                {vm.engineVersion}
              </p>
            </>
          ) : null}
        </div>
      </button>

      {!collapsed ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Birth details completeness">
            {vm.chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChip(chip)}
                className={cn(
                  "min-h-10 rounded-full border px-3 text-xs font-semibold",
                  chip.complete
                    ? "border-white/20 bg-white/10 text-[hsl(40_20%_96%/0.9)]"
                    : "border-white/12 bg-transparent text-[hsl(40_20%_96%/0.7)]",
                )}
                aria-label={`${chip.label}: ${chip.complete ? "complete" : "missing"}`}
                data-testid={`birth-sky-chip-${chip.id}`}
              >
                {chip.label}
                {chip.complete ? " · Done" : " · Add"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-[hsl(40_30%_80%)] underline-offset-2 hover:underline"
            onClick={onRegenerateEntry}
            data-testid="birth-sky-regenerate-entry"
          >
            Update sky details
          </button>
        </>
      ) : null}
    </section>
  );
}
