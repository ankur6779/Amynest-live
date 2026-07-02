import type { ReactNode } from "react";
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
  className?: string;
  footer?: ReactNode;
};

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
        "bg-[linear-gradient(140deg,rgba(255,255,255,0.2),rgba(255,255,255,0.06))]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_8px_18px_-12px_rgba(6,10,26,0.75)] backdrop-blur-xl",
        "transition-transform duration-300 hover:-translate-y-[1px] will-change-transform",
        borderClass,
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.25} />
      {label}
    </span>
  );
}

/** Shared premium glass feature card shell (Learning Zone + Creativity). */
export function HubPremiumFeatureCard({
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
  className,
  footer,
}: HubPremiumFeatureCardProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const cleanTitle = stripHubTileEmoji(title);

  return (
    <div
      className={cn(
        "lz-premium-card group relative w-full overflow-visible rounded-[30px]",
        "transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-[4px]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-[32px] opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: visual.ambientGlow }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[30px] opacity-60"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.08) 42%, rgba(255,255,255,0.02) 75%)",
        }}
      />

      <div
        className={cn(
          "relative min-h-[124px] overflow-hidden rounded-[30px] border border-white/[0.18]",
          "shadow-[0_22px_54px_-22px_rgba(5,10,26,0.92),0_0_0_1px_rgba(255,255,255,0.1)_inset,0_1px_0_rgba(255,255,255,0.16)_inset]",
          "transition-[box-shadow,border-color] duration-300",
          visual.borderHover,
          "group-hover:shadow-[0_28px_62px_-24px_rgba(5,10,26,0.95),0_0_0_1px_rgba(255,255,255,0.14)_inset,0_1px_0_rgba(255,255,255,0.22)_inset]",
        )}
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 42%, rgba(255,255,255,0.06) 100%), ${visual.surfaceGradient}`,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 34%, transparent 58%), radial-gradient(ellipse 48% 76% at 0% 50%, rgba(255,255,255,0.12), transparent 58%), radial-gradient(ellipse 100% 42% at 50% 118%, rgba(255,255,255,0.12), rgba(255,255,255,0) 66%), radial-gradient(ellipse 120% 90% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.22) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[1px] rounded-[29px]"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -18px 34px rgba(5,10,28,0.18)",
          }}
        />

        <div className="relative grid min-h-[124px] grid-cols-[48px_minmax(0,1fr)_96px] items-center gap-x-3 px-4 py-3.5 sm:grid-cols-[52px_minmax(0,1fr)_112px] sm:gap-x-4 sm:px-5">
          <div className="flex h-full items-center justify-center">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-2 rounded-[20px] blur-md"
                style={{
                  background:
                    "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.55), rgba(255,255,255,0.08) 58%, transparent 72%)",
                }}
              />
              <div
                className={cn(
                  "relative flex h-[46px] w-[46px] items-center justify-center rounded-[16px] sm:h-[50px] sm:w-[50px]",
                  "border border-white/30 bg-[linear-gradient(160deg,rgba(255,255,255,0.38),rgba(255,255,255,0.08)_58%,rgba(255,255,255,0.04))]",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-8px_18px_rgba(43,58,123,0.18),0_16px_30px_-16px_rgba(6,10,28,0.8)]",
                  "backdrop-blur-2xl transition-transform duration-300 group-hover:-translate-y-[1px]",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/18"
                />
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
          </div>

          <div className="flex min-w-0 flex-col justify-center gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-quicksand text-[16px] font-bold leading-[1.12] tracking-[-0.015em] text-white sm:text-[18px]">
                {cleanTitle}
              </p>
              {previewBadge ? (
                <span className="shrink-0 rounded-full border border-white/22 bg-white/[0.08] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl sm:text-[9px]">
                  {previewBadge}
                </span>
              ) : null}
              {tryFree && showTryFreeBadge ? <TryFreeBadge /> : null}
            </div>
            {description ? (
              <p className="line-clamp-1 max-w-[46ch] text-[12px] leading-[1.35] text-white/84 sm:text-[12.5px]">
                {description}
              </p>
            ) : null}
            <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
              {showChips ? (
                <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-hidden">
                  {visual.chips.map((chip) => (
                    <GlassChip
                      key={chip.labelKey}
                      icon={chip.icon}
                      label={t(chip.labelKey, chip.defaultLabel)}
                      borderClass={visual.chipBorder}
                    />
                  ))}
                </div>
              ) : (
                <div />
              )}
              <div className="shrink-0">
                {actionMode === "expand" ? (
                  <motion.span
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-full",
                      "border border-white/32 bg-[linear-gradient(160deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))]",
                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_12px_20px_-14px_rgba(6,10,26,0.8)]",
                      "backdrop-blur-2xl transition-transform duration-300 group-hover:scale-[1.03] will-change-transform",
                      visual.ctaShadow,
                    )}
                    animate={expanded ? { rotate: 180 } : { rotate: 0 }}
                    transition={{ duration: 0.32, ease: "easeInOut" }}
                  >
                    <ChevronDown className="h-[17px] w-[17px] text-white/90" strokeWidth={2.25} />
                  </motion.span>
                ) : actionLabel ? (
                  <motion.span
                    className={cn(
                      "relative inline-flex h-8 items-center gap-1.5 rounded-full border border-white/30 px-3.5 text-[11px] font-semibold text-white sm:h-9 sm:px-4 sm:text-[12px]",
                      "bg-gradient-to-r shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_24px_-16px_rgba(8,10,28,0.92)]",
                      "backdrop-blur-2xl transition-transform duration-300 will-change-transform",
                      visual.ctaGradient,
                      visual.ctaShadow,
                      "group-hover:scale-[1.03]",
                    )}
                    whileHover={reducedMotion ? undefined : { scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {actionLabel}
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span
                      aria-hidden
                      className="lz-cta-ripple pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                    />
                  </motion.span>
                ) : null}
              </div>
            </div>
            {footer}
          </div>

          <div className="relative flex h-full items-center justify-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 55%, rgba(250,201,255,0.34) 0%, rgba(134,171,255,0.18) 38%, rgba(7,10,36,0) 70%)",
              }}
            />
            <motion.img
              src={visual.heroSrc}
              alt=""
              aria-hidden
              className="relative max-h-[100px] w-auto max-w-[112px] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
              animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
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
}
