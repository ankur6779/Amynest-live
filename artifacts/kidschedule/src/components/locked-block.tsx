import { usePaywall, type PaywallReason } from "@/contexts/paywall-context";
import { PremiumBadge } from "@/components/premium-badge";

interface LockedBlockProps {
  /** True after the user has consumed their one free use of this feature. */
  locked: boolean;
  /** Reason passed to the paywall when tapped. */
  reason?: PaywallReason;
  label?: string;
  cta?: string;
  rounded?: string;
  children: React.ReactNode;
}

/**
 * Wraps a Parent Hub section.
 *
 * locked=false  → children rendered fully interactive (free first-use OR premium)
 * locked=true   → children visible but NON-interactive; a transparent overlay
 *                 intercepts every tap and opens the paywall. A "Premium" badge
 *                 floats top-right (above the overlay) as an additional entry point.
 *
 * This prevents free users from expanding a section after their one free use.
 */
export function LockedBlock({
  locked,
  reason = "section_locked",
  rounded = "rounded-3xl",
  children,
}: LockedBlockProps) {
  const { openPaywall } = usePaywall();

  if (!locked) return <>{children}</>;

  return (
    <div
      className={`relative ${rounded}`}
      data-testid="locked-block"
    >
      {/* Section renders visually in collapsed state, but not interactive */}
      <div style={{ pointerEvents: "none" }}>
        {children}
      </div>

      {/* Transparent full-cover overlay — intercepts every tap, fires paywall */}
      <div
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
        onClick={() => openPaywall(reason)}
        role="button"
        tabIndex={0}
        aria-label="Premium feature — tap to unlock"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPaywall(reason);
        }}
      />

      {/* Premium badge — sits above the overlay so it is always tappable */}
      <div className="pointer-events-none absolute right-12 top-3.5 z-20">
        <div className="pointer-events-auto">
          <PremiumBadge onClick={() => openPaywall(reason)} />
        </div>
      </div>
    </div>
  );
}
