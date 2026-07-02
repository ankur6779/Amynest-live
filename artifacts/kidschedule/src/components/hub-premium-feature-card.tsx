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
  expanded?: boolean;
  showChips?: boolean;
  /** Section headers are compact; child cards carry illustration + chips. */
  variant?: "section" | "child";
  className?: string;
  footer?: ReactNode;
};

const CHEVRON_SPRING = { type: "spring" as const, stiffness: 420, damping: 30 };

/** Uniform Open CTA — identical sizing across all hub child cards. */
const HUB_OPEN_CTA_CLASS =
  "relative inline-flex h-11 w-[92px] shrink-0 items-center justify-center gap-1 rounded-full border border-white/30 px-3 text-[12px] font-semibold leading-none text-white bg-gradient-to-r shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_24px_-16px_rgba(8,10,28,0.92)] transition-transform duration-300";

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
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold text-white/92 sm:px-3 sm:text-[11px]",
        "bg-[linear-gradient(140deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
        borderClass,
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.25} />
      {label}
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
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
        "border border-white/16 bg-white/[0.07]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
        className,
      )}
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
          "group relative w-full overflow-visible rounded-[18px]",
          "transition-[box-shadow,border-color] duration-300",
          className,
        )}
      >
        <div
          className={cn(
            "relative flex h-[76px] items-center gap-2.5 overflow-hidden rounded-[18px] border px-3 sm:px-3.5",
            "bg-[rgba(4,8,22,0.62)]",
            "transition-[box-shadow,border-color] duration-300",
            expanded
              ? "border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              : "border-white/[0.07]",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
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

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="min-w-0 flex-1 line-clamp-2 font-quicksand text-[17px] font-bold leading-[1.2] tracking-[-0.01em] text-white/88">
              {cleanTitle}
            </p>
            {actionMode === "expand" ? <ExpandChevron expanded={expanded} /> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "lz-premium-card group relative h-full w-full overflow-visible rounded-[30px]",
        "transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-[4px]",
        className,
      )}
    >
      <div
        aria-hidden
        className="lz-ambient-glow pointer-events-none absolute -inset-1 rounded-[32px]"
        style={{ background: visual.ambientGlow }}
      />

      <div
        className={cn(
          "lz-glass-panel relative h-[128px] overflow-hidden rounded-[30px] border border-white/[0.22]",
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
          className="pointer-events-none absolute inset-0"
          style={{ background: CHILD_SHELL_BG }}
        />

        <div
          className={cn(
            "relative grid h-[128px] grid-cols-[48px_minmax(0,1fr)_92px_88px] items-start gap-x-2.5 px-4 py-3.5",
            "sm:grid-cols-[52px_minmax(0,1fr)_92px_96px] sm:gap-x-3 sm:px-5",
          )}
        >
          <div className="flex items-center justify-center self-center">
            <div
              className={cn(
                "relative flex h-[46px] w-[46px] items-center justify-center rounded-[16px] sm:h-[50px] sm:w-[50px]",
                "border border-white/30 bg-[linear-gradient(160deg,rgba(255,255,255,0.38),rgba(255,255,255,0.08)_58%,rgba(255,255,255,0.04))]",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_30px_-16px_rgba(6,10,28,0.8)]",
                "transition-transform duration-300 group-hover:-translate-y-[1px]",
              )}
            >
              <img
                src={visual.iconSrc}
                alt=""
                aria-hidden
                className="h-[36px] w-[36px] object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)] sm:h-[40px] sm:w-[40px]"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
            <p className="line-clamp-2 font-quicksand text-[16px] font-semibold leading-[1.2] tracking-[-0.015em] text-white">
              {cleanTitle}
            </p>
            {(previewBadge || (tryFree && showTryFreeBadge)) ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {previewBadge ? (
                  <span className="shrink-0 rounded-full border border-white/22 bg-white/[0.08] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] sm:text-[9px]">
                    {previewBadge}
                  </span>
                ) : null}
                {tryFree && showTryFreeBadge ? <TryFreeBadge /> : null}
              </div>
            ) : null}
            {description ? (
              <p className="line-clamp-2 text-[13px] leading-[1.35] text-white/82">
                {description}
              </p>
            ) : null}
            {showChips && visibleChips.length > 0 ? (
              <div className="mt-0.5 grid max-w-full grid-cols-2 gap-1.5">
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

          <div className="flex items-center justify-center self-start">
            {actionMode === "expand" ? (
              <ExpandChevron expanded={expanded} />
            ) : actionLabel ? (
              <motion.span
                className={cn(HUB_OPEN_CTA_CLASS, visual.ctaGradient, visual.ctaShadow, "group-hover:scale-[1.03]")}
                whileHover={reducedMotion ? undefined : { scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="truncate">{actionLabel}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                <span
                  aria-hidden
                  className="lz-cta-ripple pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                />
              </motion.span>
            ) : null}
          </div>

          <div className="relative flex h-full items-end justify-center pb-1.5">
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
              className={cn(
                "relative h-[92px] w-auto max-w-[88px] object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)] sm:max-w-[92px]",
                !reducedMotion && "lz-char-idle",
              )}
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
