import { usePaywall, type PaywallReason } from "@/contexts/paywall-context";
import { PremiumBadge } from "@/components/premium-badge";

interface LockedBlockProps {
  /** True after the user has consumed their one free use of this feature. */
  locked: boolean;
  /** Reason passed to the paywall when the badge is tapped. */
  reason?: PaywallReason;
  /**
   * Older props (kept for API compatibility — they used to drive the
   * blurred-overlay copy and are now unused). Safe to omit.
   */
  label?: string;
  cta?: string;
  rounded?: string;
  children: React.ReactNode;
}

/**
 * Wraps a Parent Hub section. Children are ALWAYS rendered passthrough — the
 * section is fully visible and interactive at all times. When `locked=true`
 * (free user has already used this feature once), a small "Premium" pill is
 * floated in the top-right corner; tapping it opens the paywall. Premium
 * users (locked=false) see no badge.
 *
 * Replaces the previous "blur the section + giant overlay button" treatment
 * per product feedback — the user wants to keep the surface visible after
 * the free trial is consumed and only show a non-intrusive Premium hint.
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
      {children}
      {/*
        Anchored just before the section's right-side chevron control
        (HubSection's chevron is a 28px circle inside px-4 padding ⇒ it spans
        ~right:16-44px). Sitting at right-12 (48px) keeps the badge clear of
        the chevron while staying within the card. pointer-events-none on the
        wrapper lets header taps pass through everywhere except the badge
        itself, which re-enables interaction with pointer-events-auto.
      */}
      <div className="pointer-events-none absolute right-12 top-3.5 z-10">
        <div className="pointer-events-auto">
          <PremiumBadge onClick={() => openPaywall(reason)} />
        </div>
      </div>
    </div>
  );
}
