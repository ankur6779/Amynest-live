/**
 * Signature Edition welcome strip — greeting, completeness, light CTAs.
 * Cosmic Portrait card holds the emotional centerpiece separately.
 */

import { useEffect, useMemo, useRef } from "react";
import {
  BirthSkyContinuousSeal,
  SEAL_SLOT_SIZES,
} from "../../components/birth-sky-seal-host";
import type { CompletenessChip, DashboardHeroVM } from "../../application/view-models/dashboard-vm";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { AMY_ASTRO_PRODUCT_SHORT } from "../../lib/branding";
import { buildPersonalizedGreeting } from "../../lib/personalized-greetings";
import { cn } from "@/lib/utils";
import "../../design/amy-astro.css";

type Props = {
  vm: DashboardHeroVM;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onChip: (chip: CompletenessChip) => void;
  onRegenerateEntry: () => void;
  onHeroPainted: () => void;
  reducedMotion: boolean;
  onAskAmy?: () => void;
  parentFirstName?: string | null;
  sunSign: string;
  moonSign: string;
  moonPhaseLabel: string;
  greetingIndex: number;
  onContinueJourney?: () => void;
};

export function BirthSkyDashboardHero({
  vm,
  collapsed,
  onToggleCollapse,
  onChip,
  onRegenerateEntry,
  onHeroPainted,
  reducedMotion,
  onAskAmy,
  parentFirstName,
  sunSign,
  moonSign,
  moonPhaseLabel,
  greetingIndex,
  onContinueJourney,
}: Props) {
  const painted = useRef(false);
  const greeting = useMemo(
    () =>
      buildPersonalizedGreeting({
        parentFirstName: parentFirstName ?? null,
        childName: vm.childName,
        moonPhaseLabel,
        sunSign,
        moonSign,
        daySky: vm.daySky,
        greetingIndex,
      }),
    [
      parentFirstName,
      vm.childName,
      moonPhaseLabel,
      sunSign,
      moonSign,
      vm.daySky,
      greetingIndex,
    ],
  );

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
        "amy-astro-glass relative overflow-hidden rounded-3xl px-4",
        collapsed ? "py-3" : "py-4",
        !reducedMotion && "amy-astro-enter",
      )}
      aria-label={`Welcome to ${vm.childName}'s universe`}
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.7)]">
            {AMY_ASTRO_PRODUCT_SHORT} · Signature Edition
          </p>
          <p
            className="amy-astro-display amy-astro-gold-text mt-1.5 text-xl font-semibold leading-snug"
            data-testid="amy-astro-personalized-hello"
          >
            {greeting.hello}
          </p>
          {!collapsed ? (
            <>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(40_20%_96%/0.82)]">
                {greeting.skyLine}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[hsl(42_60%_78%/0.9)]">
                {greeting.moonLead}
              </p>
              <p
                className="mt-2 text-xs text-[hsl(40_20%_96%/0.45)]"
                data-testid="birth-sky-hero-essence"
              >
                {vm.essenceLine}
              </p>
              <p className="sr-only" data-testid="birth-sky-hero-versions">
                Formed {vm.computedAtLabel}
              </p>
            </>
          ) : (
            <h2 className="amy-astro-display amy-astro-gold-text mt-1 text-lg font-semibold">
              {vm.childName}
            </h2>
          )}
        </div>
      </button>

      {!collapsed ? (
        <>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Birth details completeness"
          >
            {vm.chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChip(chip)}
                className={cn(
                  "amy-astro-ripple min-h-10 rounded-full border px-3 text-xs font-semibold transition-colors",
                  chip.complete
                    ? "border-[hsl(42_50%_60%/0.35)] bg-[hsl(42_40%_30%/0.25)] text-[hsl(42_80%_82%)]"
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

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="amy-astro-ripple min-h-11 flex-1 rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] text-sm font-semibold text-white shadow-[0_0_24px_hsl(275_70%_40%/0.35)]"
              onClick={onContinueJourney ?? onAskAmy}
              data-testid="amy-astro-hero-continue"
            >
              {greeting.cta}
            </button>
            {onAskAmy ? (
              <button
                type="button"
                className="amy-astro-ripple min-h-11 flex-1 rounded-xl border border-white/15 bg-white/[0.04] text-xs font-semibold text-[hsl(40_30%_85%)]"
                onClick={onAskAmy}
                data-testid="amy-astro-hero-ask-amy"
              >
                Chat with Amy
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[hsl(40_30%_80%/0.7)] underline-offset-2 hover:underline"
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
