import { memo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TryFreeBadge } from "@/components/try-free-badge";
import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import { stripHubTileEmoji } from "@/lib/hub-premium-card-types";
import { HUB_FEATURE_BADGE } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type HubPremiumFeatureCardProps = {
  visual: HubPremiumCardVisual;
  title: string;
  description: string;
  tryFree?: boolean;
  showTryFreeBadge?: boolean;
  previewBadge?: string;
  /** When true the tile is in expanded state (subtle visual feedback only). */
  expanded?: boolean;
  showChips?: boolean;
  /** Section headers are compact; child cards carry illustration + chips. */
  variant?: "section" | "child";
  className?: string;
  footer?: ReactNode;
};

const MAX_VISIBLE_CHIPS = 2;

const CHILD_SHELL_BG =
  "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 34%, transparent 58%), radial-gradient(ellipse 48% 76% at 0% 50%, rgba(255,255,255,0.14), transparent 58%), radial-gradient(ellipse 100% 42% at 50% 118%, rgba(255,255,255,0.14), rgba(255,255,255,0) 66%)";

function GlassChip({
  icon: Icon,
  label,
  borderClass,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  borderClass: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[1.375rem] min-w-0 items-center gap-1.5 overflow-hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white/92",
        "bg-[linear-gradient(140deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
        borderClass,
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.25} />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Shared premium glass feature card shell — flex/grid layout, no floating CTAs. */
export const HubPremiumFeatureCard = memo(function HubPremiumFeatureCard({
  visual,
  title,
  description,
  tryFree,
  showTryFreeBadge = true,
  previewBadge,
  expanded = false,
  showChips = true,
  variant = "child",
  className,
  footer,
}: HubPremiumFeatureCardProps) {
  const { t } = useTranslation();
  const cleanTitle = stripHubTileEmoji(title);
  const isSection = variant === "section";
  const visibleChips = visual.chips.slice(0, MAX_VISIBLE_CHIPS);

  if (isSection) {
    return (
      <div
        className={cn(
          "group relative w-full max-w-full overflow-hidden rounded-[18px]",
          "transition-[box-shadow,border-color,transform] duration-300",
          expanded
            ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "group-hover:-translate-y-0.5 group-active:scale-[0.985]",
          className,
        )}
        data-expanded={expanded || undefined}
      >
        <div
          className={cn(
            "hub-section-shell relative flex min-h-[4.5rem] items-center overflow-hidden rounded-[18px] border",
            "bg-[rgba(4,8,22,0.62)]",
            "transition-[box-shadow,border-color] duration-300",
            expanded ? "border-white/18" : "border-white/[0.07]",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] sm:h-9 sm:w-9",
              "border border-white/10 bg-white/[0.03]",
            )}
          >
            <img
              src={visual.iconSrc}
              alt=""
              aria-hidden
              className="h-5 w-5 object-contain opacity-80"
              loading="lazy"
              decoding="async"
            />
          </div>
          <p className="hub-section-title min-w-0 flex-1">{cleanTitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "lz-premium-card group relative w-full max-w-full overflow-hidden rounded-[30px]",
        "transition-[transform,box-shadow,border-color] duration-300",
        className,
      )}
      data-expanded={expanded || undefined}
    >
      <div
        className={cn(
          "hub-feature-tile lz-glass-panel relative overflow-hidden rounded-[30px] border border-white/[0.22]",
          "shadow-[0_22px_54px_-22px_rgba(5,10,26,0.92),0_0_0_1px_rgba(255,255,255,0.12)_inset,0_1px_0_rgba(255,255,255,0.2)_inset]",
          "transition-[box-shadow,border-color] duration-300",
          visual.borderHover,
          expanded && "border-white/30 shadow-[0_24px_58px_-22px_rgba(5,10,26,0.95),0_0_0_1px_rgba(255,255,255,0.18)_inset]",
          "group-hover:shadow-[0_28px_62px_-24px_rgba(5,10,26,0.95),0_0_0_1px_rgba(255,255,255,0.16)_inset,0_1px_0_rgba(255,255,255,0.24)_inset]",
        )}
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04) 42%, rgba(255,255,255,0.08) 100%), ${visual.surfaceGradient}`,
        }}
      >
        <div
          aria-hidden
          className="lz-ambient-glow pointer-events-none absolute inset-0 rounded-[30px]"
          style={{ background: visual.ambientGlow }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: CHILD_SHELL_BG }}
        />

        <div className="hub-feature-tile__grid">
          <div className="hub-feature-tile__text">
            <p className="hub-feature-tile__title">{cleanTitle}</p>
            {(previewBadge || (tryFree && showTryFreeBadge)) ? (
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {previewBadge ? (
                  <span className={HUB_FEATURE_BADGE}>{previewBadge}</span>
                ) : null}
                {tryFree && showTryFreeBadge ? <TryFreeBadge /> : null}
              </div>
            ) : null}
            {description ? <p className="hub-feature-tile__desc">{description}</p> : null}
            {showChips && visibleChips.length > 0 ? (
              <div className="hub-feature-tile__chips">
                {visibleChips.map((chip) => (
                  <GlassChip
                    key={chip.labelKey}
                    icon={chip.icon}
                    label={t(chip.labelKey, chip.defaultLabel)}
                    borderClass={visual.chipBorder}
                  />
                ))}
              </div>
            ) : null}
            {footer}
          </div>

          <div className="hub-feature-tile__media" aria-hidden>
            <img
              src={visual.heroSrc}
              alt=""
              width={96}
              height={96}
              className="hub-feature-tile__hero"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
