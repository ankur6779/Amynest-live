import { useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { TryFreeBadge } from "@/components/try-free-badge";
import { useSectionUsage } from "@/hooks/use-section-usage";

interface SubItemGateProps {
  /**
   * The Parent Hub section this sub-item lives in (e.g. "hub_articles",
   * "hub_tips", "hub_story_hub"). Sub-items in different sections are
   * tracked independently — each gated section gets ONE free sub-item.
   */
  sectionId: string;
  /**
   * Stable identifier for this sub-item within the section (e.g. an
   * articleId, a tip-category key, a sub-section title).
   */
  subItemId: string;
  /**
   * Optional className for the wrapper div. Use this when the parent
   * relies on a specific layout (grid item, full-width, etc).
   */
  className?: string;
  /**
   * When true, no padding/margin is added around children. The wrapper
   * is just `display: contents`-style transparent in layout terms by
   * mirroring the children's natural box.
   */
  children: ReactNode;
}

/**
 * Wraps a single interactive sub-item inside a gated Parent Hub section.
 *
 * Behaviour for free users:
 *   • If no sub-item in this section has been used → renders children with
 *     a small "Try Free" pill in the top-right. The first tap inside the
 *     children records this sub-item as the free one and lets the click
 *     propagate normally.
 *   • If THIS sub-item is the one the user already used → passthrough.
 *   • If a different sub-item in this section has been used → renders
 *     children visually but non-interactive, with a "Premium feature"
 *     lock pill that routes to /pricing on tap.
 *
 * Premium users always see passthrough — no badges, no overlays.
 */
export function SubItemGate({
  sectionId,
  subItemId,
  className,
  children,
}: SubItemGateProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { isPremium, blockUsedId, isBlockLocked, markBlockUsed } =
    useSectionUsage(sectionId);

  const goPricing = useCallback(() => setLocation("/pricing"), [setLocation]);

  // Premium users — always full access, no badges or overlays.
  if (isPremium) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  // Already the free sub-item the user picked → passthrough, no badge.
  if (blockUsedId === subItemId) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
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

  // Try-free variant — first interaction marks this as the free sub-item.
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
