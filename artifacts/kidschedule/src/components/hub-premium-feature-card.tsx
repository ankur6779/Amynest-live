import { memo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TryFreeBadge } from "@/components/try-free-badge";
import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import { stripHubTileEmoji } from "@/lib/hub-premium-card-types";
import { cn } from "@/lib/utils";

type HubPremiumFeatureCardProps = {
  visual: HubPremiumCardVisual;
  title: string;
  description: string;
  tryFree?: boolean;
  showTryFreeBadge?: boolean;
  previewBadge?: string;
  /** Navigate-style CTA label (learning / curiosity launch tiles). */
  actionLabel?: string;
  /** Expandable hub sections use a glass chevron control. */
  actionMode?: "open" | "expand";
  /** Compact circular chevron for navigation tiles (coach promo cards). */
  iconOnlyAction?: boolean;
  expanded?: boolean;
  showChips?: boolean;
  /** Section headers are compact; child cards carry illustration + chips. */
  variant?: "section" | "child";
  className?: string;
  footer?: ReactNode;
};

const CHEVRON_SPRING = { type: "spring" as const, stiffness: 420, damping: 30 };

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
        "inline-flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full border px-2 py-1 text-[10px] font-semibold text-white/92",
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

function ExpandChevron({
  expanded,
  className,
}: {
  expanded: boolean;
  className?: string;
}) {
  return (
    <motion.span
      className={cn("hub-expand-chevron", className)}
      animate={expanded ? { rotate: 180 } : { rotate: 0 }}
      transition={CHEVRON_SPRING}
    >
      <ChevronDown className="h-[14px] w-[14px] text-white/70" strokeWidth={1.75} />
    </motion.span>
  );
}

/** Shared premium glass feature card shell (Learning Zone + Creativity). */
export const HubPremiumFeatureCard = memo(function HubPremiumFeatureCard({
  visual,
  title,
  description,
  tryFree,
  showTryFreeBadge = true,
  previewBadge,
  actionLabel,
  actionMode = "open",
  iconOnlyAction = false,
  expanded = false,
  showChips = true,
  variant = "child",
  className,
  footer,
}: HubPremiumFeatureCardProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const cleanTitle = stripHubTileEmoji(title);
  const isSection = variant === "section";
  const visibleChips = visual.chips.slice(0, MAX_VISIBLE_CHIPS);

  if (isSection) {
    return (
      <div
        className={cn(
          "group relative w-full max-w-full overflow-hidden rounded-[18px]",
          "transition-[box-shadow,border-color] duration-300",
          className,
        )}
      >
        <div
          className={cn(
            "hub-section-shell relative flex min-h-[76px] items-center overflow-hidden rounded-[18px] border",
            "bg-[rgba(4,8,22,0.62)]",
            "transition-[box-shadow,border-color] duration-300",
            expanded
              ? "border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              : "border-white/[0.07]",
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

          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            <p className="hub-section-title min-w-0 flex-1">{cleanTitle}</p>
            {actionMode === "expand" ? <ExpandChevron expanded={expanded} /> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "lz-premium-card group relative w-full max-w-full overflow-hidden rounded-[30px]",
        "transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-[4px]",
        className,
      )}
    >
      <div
        className={cn(
          "lz-glass-panel hub-child-shell relative overflow-hidden rounded-[30px] border border-white/[0.22]",
          "shadow-[0_22px_54px_-22px_rgba(5,10,26,0.92),0_0_0_1px_rgba(255,255,255,0.12)_inset,0_1px_0_rgba(255,255,255,0.2)_inset]",
          "transition-[box-shadow,border-color] duration-300",
          visual.borderHover,
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

        <div className="hub-child-grid relative">
          <div className="hub-child-icon-wrap">
            <div className="hub-child-icon-box">
              <img
                src={visual.iconSrc}
                alt=""
                aria-hidden
                className="hub-child-icon-img"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <div className="hub-child-text-col flex flex-col gap-1">
            <p className="hub-child-title">{cleanTitle}</p>
            {(previewBadge || (tryFree && showTryFreeBadge)) ? (
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {previewBadge ? (
                  <span className="shrink-0 rounded-full border border-white/22 bg-white/[0.08] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] sm:px-2 sm:text-[9px]">
                    {previewBadge}
                  </span>
                ) : null}
                {tryFree && showTryFreeBadge ? <TryFreeBadge /> : null}
              </div>
            ) : null}
            {description ? <p className="hub-child-subtitle">{description}</p> : null}
            {showChips && visibleChips.length > 0 ? (
              <div className="hub-child-chips">
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

          <div className="hub-child-action-col flex items-center justify-center self-start">
            {actionMode === "expand" ? (
              <ExpandChevron expanded={expanded} />
            ) : iconOnlyAction ? (
              <motion.span
                className={cn(
                  "hub-expand-chevron border-white/20 bg-white/[0.12]",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.25)]",
                  "group-hover:scale-[1.05]",
                )}
                whileHover={reducedMotion ? undefined : { scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <ChevronRight className="h-[14px] w-[14px] text-white/90" strokeWidth={2.25} />
              </motion.span>
            ) : actionLabel ? (
              <motion.span
                className={cn(
                  "hub-open-cta bg-gradient-to-r",
                  visual.ctaGradient,
                  visual.ctaShadow,
                  "group-hover:scale-[1.03]",
                )}
                whileHover={reducedMotion ? undefined : { scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="min-w-0 truncate">{actionLabel}</span>
                <ChevronRight className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} />
                <span
                  aria-hidden
                  className="lz-cta-ripple pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                />
              </motion.span>
            ) : null}
          </div>

          <div className="hub-child-hero-col">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 80%, rgba(250,201,255,0.28) 0%, rgba(134,171,255,0.14) 38%, rgba(7,10,36,0) 70%)",
              }}
            />
            <img
              src={visual.heroSrc}
              alt=""
              aria-hidden
              className={cn("hub-child-hero", !reducedMotion && "lz-char-idle")}
              loading="lazy"
              decoding="async"
            />
            <span
              aria-hidden
              className="lz-sparkle pointer-events-none absolute right-[10%] top-[14%] h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            />
            <span
              aria-hidden
              className="lz-sparkle pointer-events-none absolute left-[8%] top-[30%] h-1 w-1 rounded-full bg-violet-100/90"
              style={{ animationDelay: "0.9s" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
