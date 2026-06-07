import React from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import type { PaywallReason } from "@/contexts/paywall-context";
import { openSubscriptionGate } from "@/lib/subscription-gate";

interface LockedBlockProps {
  /** True after the user has consumed their one free use of this feature. */
  locked: boolean;
  /**
   * Journey soft lock — tile stays openable; content shows blurred preview + CTA.
   * Used after the 3-day free journey ends (replaces hard overlay).
   */
  journeySoft?: boolean;
  /** Child name for journey soft-lock CTA copy. */
  childName?: string;
  /** Infant child (0–24 months) — uses care-focused journey copy. */
  isInfant?: boolean;
  /**
   * Infant "Explore What's Next" discovery surface — keep tiles browsable;
   * server enforces preview-only mutations.
   */
  discoveryPreview?: boolean;
  /** Paywall reason passed to openPaywall (defaults to hub_journey). */
  reason?: PaywallReason;
  rounded?: string;
  children: React.ReactNode;
}

/**
 * Wraps a Parent Hub section.
 *
 * locked=false       → children rendered fully interactive
 * locked + journeySoft → children interactive; HubSection shows blurred preview when expanded
 * locked (hard)      → children visible but NON-interactive; overlay opens paywall
 */
export function LockedBlock({
  locked,
  journeySoft = false,
  childName,
  isInfant = false,
  discoveryPreview = false,
  reason = "hub_journey",
  rounded = "rounded-3xl",
  children,
}: LockedBlockProps) {
  const { t } = useTranslation();
  const openGate = () =>
    openSubscriptionGate({ reason, source: "locked_block" });

  if (discoveryPreview) return <>{children}</>;

  if (!locked) return <>{children}</>;

  if (journeySoft) {
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        previewLocked: true,
        childName,
        isInfant,
      });
    }
    return <>{children}</>;
  }

  const ariaLabel = t("parent_hub.badges.premium_feature_aria");

  return (
    <div
      className={`relative ${rounded}`}
      data-testid="locked-block"
    >
      <div style={{ pointerEvents: "none" }}>
        {children}
      </div>

      <div
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
        onClick={openGate}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        data-testid="locked-block-overlay"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openGate();
        }}
      />

      <div className="pointer-events-none absolute right-12 top-3.5 z-20">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={openGate}
            data-testid="premium-feature-lock"
            aria-label={ariaLabel}
            className="inline-flex items-center gap-1 rounded-full bg-card text-primary-foreground shadow-md shadow px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide cursor-pointer hover:brightness-110 transition"
          >
            <Lock className="h-2.5 w-2.5" />
            {t("parent_hub.badges.premium_feature")}
          </button>
        </div>
      </div>
    </div>
  );
}
