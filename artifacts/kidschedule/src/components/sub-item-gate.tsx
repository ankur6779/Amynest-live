import { useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { TryFreeBadge } from "@/components/try-free-badge";
import { useSectionUsage } from "@/hooks/use-section-usage";
import { useSubscription } from "@/hooks/use-subscription";
import {
  isPhonicsSubItemUnlocked,
  phonicsSubItemUnlockDay,
} from "@workspace/parent-hub-journey";

interface SubItemGateProps {
  /**
   * The Parent Hub section this sub-item lives in (e.g. "hub_articles",
   * "hub_tips", "hub_story_hub"). Sub-items in different sections are
   * tracked independently — each gated section gets TWO free sub-items.
   */
  sectionId: string;
  /**
   * Stable identifier for this sub-item within the section (e.g. an
   * articleId, a tip-category key, a sub-section title).
   */
  subItemId: string;
  /**
   * When set with `journeyGated`, phonics sub-items unlock cumulatively by
   * hub journey day instead of the legacy two-free-picks quota.
   */
  journeyDay?: number;
  /** Use 3-day hub journey unlock rules (phonics module). */
  journeyGated?: boolean;
  /** True while the user is still in the 3-day free journey window. */
  journeyFreePeriod?: boolean;
  /**
   * Optional className for the wrapper div. Use this when the parent
   * relies on a specific layout (grid item, full-width, etc).
   */
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a single interactive sub-item inside a gated Parent Hub section.
 *
 * Behaviour for free users:
 *   • Hub journey (phonics): sub-items unlock by journey day 1 → 2 → 3.
 *   • Legacy: up to two sub-items per section lifetime, then lock.
 *
 * Premium users always see passthrough — no badges, no overlays.
 */
export function SubItemGate({
  sectionId,
  subItemId,
  journeyDay,
  journeyGated = false,
  journeyFreePeriod = false,
  className,
  children,
}: SubItemGateProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { isPremium: subPremium } = useSubscription();
  const { isPremium, blockUsedIds, isBlockLocked, markBlockUsed } =
    useSectionUsage(sectionId);

  const goPricing = useCallback(() => setLocation("/pricing"), [setLocation]);
  const goHub = useCallback(() => setLocation("/parenting-hub"), [setLocation]);

  const wrap = (node: ReactNode) =>
    className ? <div className={className}>{node}</div> : <>{node}</>;

  // Premium users — always full access, no badges or overlays.
  if (isPremium || subPremium) {
    return wrap(children);
  }

  // Phonics ↔ 3-day journey: day-based cumulative unlock during free period.
  if (sectionId === "hub_phonics" && journeyGated && journeyFreePeriod) {
    const day = journeyDay ?? 1;
    if (isPhonicsSubItemUnlocked(subItemId, day)) {
      return wrap(children);
    }
    const unlockDay = phonicsSubItemUnlockDay(subItemId) ?? day + 1;
    return (
      <div
        className={`relative ${className ?? ""}`.trim()}
        data-testid={`sub-item-journey-locked-${subItemId}`}
      >
        <div style={{ pointerEvents: "none" }} aria-hidden="true">
          {children}
        </div>
        <button
          type="button"
          onClick={goHub}
          aria-label={t("components.phonics_learning.journey_unlock_aria", {
            day: unlockDay,
          })}
          data-testid="sub-item-journey-lock-overlay"
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl bg-background/40 backdrop-blur-[2px] hover:bg-background/50 transition-colors flex items-center justify-center px-4"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-card text-foreground shadow-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-center">
            <Lock className="h-3 w-3 shrink-0" />
            {t("components.phonics_learning.journey_unlock_day", { day: unlockDay })}
          </span>
        </button>
      </div>
    );
  }

  // Already one of the free sub-items the user picked → passthrough, no badge.
  if (blockUsedIds.includes(subItemId)) {
    return wrap(children);
  }

  const locked = isBlockLocked(subItemId);

  // Locked variant — visually rendered, fully non-interactive, tap → /pricing.
  if (locked) {
    return (
      <div
        className={`relative ${className ?? ""}`.trim()}
        data-testid={`sub-item-locked-${subItemId}`}
      >
        <div style={{ pointerEvents: "none" }} aria-hidden="true">
          {children}
        </div>
        <button
          type="button"
          onClick={goPricing}
          aria-label={t("parent_hub.badges.premium_feature_aria")}
          data-testid="sub-item-lock-overlay"
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl bg-background/30 backdrop-blur-[1px] hover:bg-background/40 transition-colors flex items-center justify-center"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-card text-primary-foreground shadow-md shadow px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
            <Lock className="h-3 w-3" />
            {t("parent_hub.badges.premium_feature")}
          </span>
        </button>
      </div>
    );
  }

  // Try-free variant — interaction marks this as a free sub-item.
  return (
    <div
      className={`relative ${className ?? ""}`.trim()}
      onClickCapture={() => markBlockUsed(subItemId)}
      onKeyDownCapture={(e) => {
        if (e.key === "Enter" || e.key === " ") markBlockUsed(subItemId);
      }}
      data-testid={`sub-item-tryfree-${subItemId}`}
    >
      {children}
      <span className="pointer-events-none absolute right-2 top-2 z-10">
        <TryFreeBadge />
      </span>
    </div>
  );
}
