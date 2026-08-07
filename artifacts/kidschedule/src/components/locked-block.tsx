import React from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import type { PaywallReason } from "@/contexts/paywall-context";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { useParentHubQuietModule } from "@/lib/parent-hub/quiet-module-context";
import { cn } from "@/lib/utils";

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
  const quietRoom = useParentHubQuietModule();
  const openGate = () =>
    openSubscriptionGate({
      reason,
      source: quietRoom ? "locked_block_quiet_room" : "locked_block",
    });

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

  // Pack 5 — continuity voice inside rooms; mall keeps unlock theatre.
  const ariaLabel = quietRoom
    ? PREMIUM_VOICE.invitation
    : t("parent_hub.badges.premium_unlock_aria", {
        defaultValue: "Unlock what this unlocks with Premium",
      });
  const badgeLabel = quietRoom
    ? PREMIUM_VOICE.continueCta
    : t("parent_hub.badges.premium_unlock", {
        defaultValue: "Unlock with Premium",
      });

  return (
    <div
      className={`relative ${rounded}`}
      data-testid="locked-block"
      data-ph-continuity={quietRoom ? "true" : undefined}
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
            className={cn(
              "inline-flex items-center gap-1 rounded-full shadow-md px-2 py-0.5 text-[10px] font-bold cursor-pointer transition",
              quietRoom
                ? "bg-[rgba(232,212,184,0.16)] text-[rgba(244,238,230,0.95)] border border-[rgba(232,212,184,0.28)] tracking-normal normal-case hover:bg-[rgba(232,212,184,0.24)]"
                : "bg-violet-600 text-white uppercase tracking-wide hover:brightness-110",
            )}
          >
            {!quietRoom ? <Lock className="h-2.5 w-2.5" /> : null}
            {badgeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
