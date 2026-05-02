import { useLocation } from "wouter";
import { Lock } from "lucide-react";
import type { PaywallReason } from "@/contexts/paywall-context";

interface LockedBlockProps {
  /** True after the user has consumed their one free use of this feature. */
  locked: boolean;
  /**
   * Legacy prop — kept for backwards compatibility with existing call sites.
   * The locked overlay no longer opens the paywall modal; it navigates to
   * the dedicated /pricing page so users see a complete plan comparison.
   */
  reason?: PaywallReason;
  /** Legacy — no longer rendered. Kept for prop compatibility. */
  label?: string;
  /** Legacy — no longer rendered. Kept for prop compatibility. */
  cta?: string;
  rounded?: string;
  children: React.ReactNode;
}

/**
 * Wraps a Parent Hub section.
 *
 * locked=false  → children rendered fully interactive (free first-use OR premium)
 * locked=true   → children visible but NON-interactive; a transparent overlay
 *                 intercepts every tap and routes to /pricing. A "Premium feature"
 *                 lock pill floats top-right (above the overlay).
 */
export function LockedBlock({
  locked,
  rounded = "rounded-3xl",
  children,
}: LockedBlockProps) {
  const [, setLocation] = useLocation();
  const goPricing = () => setLocation("/pricing");

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

      {/* Transparent full-cover overlay — intercepts every tap, routes to /pricing */}
      <div
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
        onClick={goPricing}
        role="button"
        tabIndex={0}
        aria-label="Premium feature — tap to upgrade"
        data-testid="locked-block-overlay"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") goPricing();
        }}
      />

      {/* Lock pill — sits above the overlay so it is always tappable */}
      <div className="pointer-events-none absolute right-12 top-3.5 z-20">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={goPricing}
            data-testid="premium-feature-lock"
            aria-label="Premium feature — tap to upgrade"
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 text-white shadow-md shadow-purple-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide cursor-pointer hover:brightness-110 transition"
          >
            <Lock className="h-2.5 w-2.5" />
            Premium feature
          </button>
        </div>
      </div>
    </div>
  );
}
