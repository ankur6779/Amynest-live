/**
 * Signature Edition welcome strip — greeting, cosmic status badges, illustrated CTAs.
 * Cosmic Portrait card holds the emotional centerpiece separately.
 */

import { useEffect, useMemo, useRef } from "react";
import {
  BirthSkyContinuousSeal,
  SEAL_SLOT_SIZES,
} from "../../components/birth-sky-seal-host";
import {
  AmyAstroIcon,
  AmyAstroStatusBadge,
} from "../../components/icons/amy-astro-icons";
import type { CompletenessChip, DashboardHeroVM } from "../../application/view-models/dashboard-vm";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { AMY_ASTRO_PRODUCT_SHORT } from "../../lib/branding";
import {
  isBirthSkyLivingV1Enabled,
  livingDashboardEditionLabel,
  livingHeroAskAmyCta,
  livingSoftCta,
  livingSoftGreetingLine,
  livingUpdateDetailsCta,
} from "@/lib/birth-sky/living-room";
import { buildPersonalizedGreeting } from "../../lib/personalized-greetings";
import type { ContinuityFacts } from "../../lib/emotional-continuity";
import { loadReplyMemory, rememberGreeting } from "../../lib/reply-memory";
import { cn } from "@/lib/utils";
import "@/components/birth-sky/birth-sky-living-deep.css";
import "../../design/amy-astro.css";

type Props = {
  vm: DashboardHeroVM;
  profileId: string;
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
  continuity?: ContinuityFacts | null;
};

export function BirthSkyDashboardHero({
  vm,
  profileId,
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
  continuity = null,
}: Props) {
  const living = isBirthSkyLivingV1Enabled();
  const painted = useRef(false);
  const greeting = useMemo(() => {
    const mem = loadReplyMemory(profileId);
    const raw = buildPersonalizedGreeting({
      parentFirstName: parentFirstName ?? null,
      childName: vm.childName,
      moonPhaseLabel,
      sunSign,
      moonSign,
      daySky: vm.daySky,
      greetingIndex,
      avoidHellos: mem.lastGreetings,
      continuity,
    });
    if (!living) return raw;
    return {
      hello: livingSoftGreetingLine(raw.hello, vm.childName),
      skyLine: livingSoftGreetingLine(raw.skyLine, vm.childName),
      moonLead: livingSoftGreetingLine(raw.moonLead, vm.childName),
      cta: livingSoftCta(raw.cta),
    };
  }, [
    parentFirstName,
    vm.childName,
    profileId,
    moonPhaseLabel,
    sunSign,
    moonSign,
    vm.daySky,
    greetingIndex,
    continuity,
    living,
  ]);

  useEffect(() => {
    rememberGreeting(profileId, greeting.hello);
  }, [profileId, greeting.hello]);

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
      aria-label={
        living
          ? `Understanding ${vm.childName}`
          : `Welcome to ${vm.childName}'s universe`
      }
      data-testid="birth-sky-dashboard-hero"
      data-collapsed={collapsed ? "true" : "false"}
      data-bs-living={living ? "1" : undefined}
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
            {living
              ? livingDashboardEditionLabel()
              : `${AMY_ASTRO_PRODUCT_SHORT} · Signature Edition`}
          </p>
          <p
            className="amy-astro-display amy-astro-gold-text amy-astro-hero-title mt-1.5 text-left text-xl font-semibold leading-snug"
            data-testid="amy-astro-personalized-hello"
          >
            {greeting.hello}
          </p>
          {!collapsed ? (
            <>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-[hsl(40_20%_96%/0.82)]">
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
            <h2 className="amy-astro-display amy-astro-gold-text amy-astro-hero-title mt-1 text-left text-lg font-semibold">
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
              <AmyAstroStatusBadge
                key={chip.id}
                kind={chip.id}
                label={chip.label}
                complete={chip.complete}
                onClick={() => onChip(chip)}
                testId={`birth-sky-chip-${chip.id}`}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className={cn(
                "amy-astro-ripple amy-astro-cta-premium flex min-h-12 flex-1 items-center justify-center gap-2.5 px-3 text-sm font-semibold",
                living
                  ? "bs-living-deep-primary-btn"
                  : "rounded-2xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] text-white shadow-[0_0_24px_hsl(275_70%_40%/0.35)]",
              )}
              onClick={onContinueJourney ?? onAskAmy}
              data-testid="amy-astro-hero-continue"
            >
              <AmyAstroIcon
                name="chapter_book"
                size={32}
                reducedMotion={reducedMotion}
                title={living ? "Continue" : "Open chapter"}
              />
              <span>{greeting.cta}</span>
            </button>
            {onAskAmy ? (
              <button
                type="button"
                className={cn(
                  "amy-astro-ripple flex min-h-12 flex-1 items-center justify-center gap-2.5 px-3 text-xs font-semibold",
                  living
                    ? "bs-living-deep-ghost-btn"
                    : "rounded-2xl border border-white/15 bg-white/[0.04] text-[hsl(40_30%_85%)]",
                )}
                onClick={onAskAmy}
                data-testid="amy-astro-hero-ask-amy"
              >
                <AmyAstroIcon
                  name="ask_amy"
                  size={32}
                  reducedMotion={reducedMotion}
                  title={living ? livingHeroAskAmyCta() : "Ask Amy"}
                />
                <span>{living ? livingHeroAskAmyCta() : "Ask Amy About Their Sky"}</span>
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="amy-astro-ripple mt-2 inline-flex min-h-12 items-center gap-2 text-xs font-semibold text-[hsl(40_30%_80%/0.75)] underline-offset-2 hover:underline"
            onClick={onRegenerateEntry}
            data-testid="birth-sky-regenerate-entry"
          >
            <AmyAstroIcon
              name="update_telescope"
              size={24}
              reducedMotion={reducedMotion}
              title={living ? livingUpdateDetailsCta() : "Update sky"}
            />
            {living ? livingUpdateDetailsCta() : "Update sky details"}
          </button>
        </>
      ) : null}
    </section>
  );
}
