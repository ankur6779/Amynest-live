import { memo, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TryFreeBadge } from "@/components/try-free-badge";
import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import { stripHubTileEmoji } from "@/lib/hub-premium-card-types";
import {
  getHubSectionHeaderTheme,
  parseSectionAccentRgb,
  parseSectionTintRgb,
} from "@/lib/hub-section-header-theme";
import { HUB_FEATURE_BADGE } from "@/lib/parent-hub-premium";
import type { HubGroupKey } from "@/lib/parent-hub-premium";
import { useParentHubQuietModule } from "@/lib/parent-hub/quiet-module-context";
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
  /** Accent identity for collapsed Parent Hub section navigation cards. */
  sectionGroupKey?: HubGroupKey;
  /** Subtle visit hint — shown inline before subtitle when collapsed. */
  lastVisitedHint?: string;
  /** Single-section smart highlight (New / Updated / etc.). */
  highlightLabel?: string;
  /** Time-of-day or routine personalization — accent intensity only. */
  isPrimary?: boolean;
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

function HubSectionNavigationCard({
  visual,
  title,
  description,
  expanded,
  sectionGroupKey,
  lastVisitedHint,
  highlightLabel,
  isPrimary = false,
  className,
}: {
  visual: HubPremiumCardVisual;
  title: string;
  description: string;
  expanded: boolean;
  sectionGroupKey: HubGroupKey;
  lastVisitedHint?: string;
  highlightLabel?: string;
  isPrimary?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const cleanTitle = stripHubTileEmoji(title);
  const headerTheme = getHubSectionHeaderTheme(sectionGroupKey);
  const [r, g, b] = parseSectionTintRgb(headerTheme.tintRgb);
  const [ar, ag, ab] = parseSectionAccentRgb(headerTheme.tintRgb);
  const navSubtitle = description.trim();
  const pillLabel = highlightLabel?.trim() || t("parent_hub.section_groups.open_section");

  return (
    <div
      className={cn(
        "hub-section-card group relative w-full max-w-full overflow-hidden rounded-[18px]",
        isPrimary && !expanded && "hub-section-card--primary",
        className,
      )}
      data-expanded={expanded || undefined}
      data-hub-section={sectionGroupKey}
      style={
        {
          "--hub-section-r": r,
          "--hub-section-g": g,
          "--hub-section-b": b,
          "--hub-section-accent-r": ar,
          "--hub-section-accent-g": ag,
          "--hub-section-accent-b": ab,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          "hub-section-shell relative flex min-h-[4.5rem] items-center overflow-hidden",
          expanded && "hub-section-shell--expanded",
        )}
      >
        <div
          aria-hidden
          className="hub-section-ambient pointer-events-none absolute inset-0 rounded-[18px]"
          style={{ background: visual.ambientGlow }}
        />
        {navSubtitle ? (
          <span
            aria-hidden={expanded}
            className="hub-section-watermark hub-section-collapsed-only pointer-events-none absolute select-none leading-none"
          >
            {headerTheme.watermark}
          </span>
        ) : null}
        <div aria-hidden className="hub-section-accent-bar absolute left-0 top-2 bottom-2 rounded-full" />
        <div className="hub-section-content">
          <div className="hub-section-icon-shell shrink-0 rounded-xl">
            <img
              src={visual.iconSrc}
              alt=""
              aria-hidden
              className="hub-section-icon-image relative z-[1]"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="hub-section-copy">
            <p className="hub-section-title">{cleanTitle}</p>
            {navSubtitle ? (
              <p className="hub-section-subtitle hub-section-collapsed-only">
                {lastVisitedHint ? (
                  <span className="hub-section-last-visited">{lastVisitedHint} · </span>
                ) : null}
                {navSubtitle}
              </p>
            ) : null}
          </div>
          <span
            aria-hidden={expanded}
            className={cn(
              "hub-section-open-pill hub-section-collapsed-only shrink-0 rounded-full",
              highlightLabel && "hub-section-open-pill--highlight",
            )}
          >
            <span className="hub-section-open-label">{pillLabel}</span>
            <ChevronDown className="hub-section-open-chevron shrink-0" strokeWidth={2.25} aria-hidden />
          </span>
        </div>
      </div>
    </div>
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
  sectionGroupKey,
  lastVisitedHint,
  highlightLabel,
  isPrimary,
  className,
  footer,
}: HubPremiumFeatureCardProps) {
  const { t } = useTranslation();
  const quietRoom = useParentHubQuietModule();
  const cleanTitle = stripHubTileEmoji(title);
  const isSection = variant === "section";
  // Pack 5 — inside rooms: no marketing badges / feature chips shelf.
  const effectivePreviewBadge = quietRoom ? undefined : previewBadge;
  const effectiveShowTryFree = quietRoom ? false : showTryFreeBadge;
  const effectiveShowChips = quietRoom ? false : showChips;
  const visibleChips = visual.chips.slice(0, MAX_VISIBLE_CHIPS);

  if (isSection) {
    if (!sectionGroupKey) {
      return null;
    }
    return (
      <HubSectionNavigationCard
        visual={visual}
        title={title}
        description={description}
        expanded={expanded}
        sectionGroupKey={sectionGroupKey}
        lastVisitedHint={lastVisitedHint}
        highlightLabel={highlightLabel}
        isPrimary={isPrimary}
        className={className}
      />
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

        <div
          className={cn(
            "hub-feature-tile__grid",
            quietRoom && "ph-quiet-feature-grid",
          )}
          data-ph-continuity={quietRoom ? "true" : undefined}
        >
          <div className="hub-feature-tile__text">
            <p className="hub-feature-tile__title">{cleanTitle}</p>
            {(effectivePreviewBadge || (tryFree && effectiveShowTryFree)) ? (
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {effectivePreviewBadge ? (
                  <span className={HUB_FEATURE_BADGE}>{effectivePreviewBadge}</span>
                ) : null}
                {tryFree && effectiveShowTryFree ? <TryFreeBadge /> : null}
              </div>
            ) : null}
            {description ? <p className="hub-feature-tile__desc">{description}</p> : null}
            {effectiveShowChips && visibleChips.length > 0 ? (
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
            <span className="hub-feature-tile__media-glow" aria-hidden />
            <img
              src={visual.heroSrc}
              alt=""
              width={132}
              height={132}
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
