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
        "inline-flex items-center gap-1.5 rounded-full border bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-white/88 sm:px-2.5 sm:py-1 sm:text-[11px]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md",
        borderClass,
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.25} />
      {label}
    </span>
  );
}

function FloatingGlyphs({
  glyphs,
  colorClass,
}: {
  glyphs: readonly string[];
  colorClass: string;
}) {
  const positions = [
    "right-[20%] top-[14%]",
    "right-[10%] top-[32%]",
    "right-[24%] top-[48%]",
    "right-[6%] top-[22%]",
    "right-[16%] top-[58%]",
  ];
  return (
    <>
      {glyphs.map((glyph, i) => (
        <span
          key={`${glyph}-${i}`}
          aria-hidden
          className={cn(
            "lz-particle-float pointer-events-none absolute text-[10px] font-bold sm:text-[11px]",
            colorClass,
            positions[i % positions.length],
          )}
          style={{ animationDelay: `${i * 0.45}s` }}
        >
          {glyph}
        </span>
      ))}
      <span
        aria-hidden
        className="lz-sparkle absolute right-[14%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.75)]"
      />
      <span
        aria-hidden
        className="lz-sparkle absolute right-[8%] top-[42%] h-1 w-1 rounded-full bg-white/70"
        style={{ animationDelay: "0.9s" }}
      />
    </>
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
        "hover:-translate-y-[4px] hover:scale-[1.01]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-[32px] opacity-65 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: visual.ambientGlow }}
      />

      <div
        className={cn(
          "relative min-h-[118px] overflow-hidden rounded-[30px] border border-white/[0.14]",
          "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
          "transition-[box-shadow,border-color] duration-300",
          visual.borderHover,
          "group-hover:shadow-[0_18px_52px_-14px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)_inset]",
        )}
        style={{
          background: visual.surfaceGradient,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, transparent 36%), radial-gradient(ellipse 45% 75% at 0% 50%, rgba(255,255,255,0.08), transparent 55%)",
          }}
        />

        <div className="relative flex min-h-[118px] items-stretch pr-[30%] sm:pr-[28%]">
          <div className="flex shrink-0 items-center p-3 sm:p-3.5">
            <div className="relative">
              <div aria-hidden className="absolute -inset-1 rounded-[22px] bg-white/10 blur-md" />
              <div
                className={cn(
                  "relative flex h-[54px] w-[54px] items-center justify-center rounded-[18px] sm:h-[58px] sm:w-[58px]",
                  "border border-white/18 bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.22)]",
                  "backdrop-blur-xl",
                )}
              >
                <img
                  src={visual.iconSrc}
                  alt=""
                  aria-hidden
                  className="h-[42px] w-[42px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] sm:h-[46px] sm:w-[46px]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-1 sm:py-3.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="font-quicksand text-[15px] font-bold leading-tight tracking-tight text-white sm:text-[16px]">
                {cleanTitle}
              </p>
              {previewBadge ? (
                <span className="shrink-0 rounded-full border border-white/12 bg-black/25 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white/90 backdrop-blur-sm sm:text-[9px]">
                  {previewBadge}
                </span>
              ) : null}
              {tryFree && showTryFreeBadge ? <TryFreeBadge /> : null}
            </div>
            {description ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/72 sm:text-[12px]">
                {description}
              </p>
            ) : null}
            {showChips ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {visual.chips.map((chip) => (
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

          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 top-0 w-[36%] sm:w-[34%]"
          >
            <motion.img
              src={visual.heroSrc}
              alt=""
              className={cn(
                "absolute bottom-0 right-[-10%] h-[112%] max-w-none object-contain object-bottom",
                "drop-shadow-[0_10px_28px_rgba(0,0,0,0.35)]",
              )}
              animate={reducedMotion ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
              loading="lazy"
              decoding="async"
            />
            <FloatingGlyphs glyphs={visual.floatingGlyphs} colorClass={visual.glyphColor} />
          </div>

          <div className="absolute bottom-3 right-3 z-10 sm:bottom-3.5 sm:right-3.5">
            {actionMode === "expand" ? (
              <motion.span
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full",
                  "border border-white/22 bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.25)]",
                  "backdrop-blur-xl transition-transform duration-300 group-hover:scale-[1.08]",
                  visual.ctaShadow,
                )}
                animate={expanded ? { rotate: 180 } : { rotate: 0 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
              >
                <ChevronDown className="h-[18px] w-[18px] text-white/90" strokeWidth={2.25} />
              </motion.span>
            ) : actionLabel ? (
              <motion.span
                className={cn(
                  "relative inline-flex h-8 items-center gap-1 rounded-full border border-white/25 px-3 text-[11px] font-black text-white sm:h-9 sm:px-3.5 sm:text-[12px]",
                  "bg-gradient-to-r backdrop-blur-xl transition-transform duration-300",
                  visual.ctaGradient,
                  visual.ctaShadow,
                  "group-hover:scale-[1.06]",
                )}
                whileHover={reducedMotion ? undefined : { scale: 1.06 }}
                whileTap={{ scale: 0.97 }}
              >
                {actionLabel}
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
                <span
                  aria-hidden
                  className="lz-cta-ripple pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                />
              </motion.span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
