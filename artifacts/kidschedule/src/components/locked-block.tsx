import { Lock, Sparkles } from "lucide-react";
import { usePaywall, type PaywallReason } from "@/contexts/paywall-context";

interface LockedBlockProps {
  /** Render children blurred + non-interactive when locked. */
  locked: boolean;
  /** Reason passed to the paywall (also used in analytics). */
  reason?: PaywallReason;
  /** Pill text shown above the CTA. */
  label?: string;
  /** Button text. */
  cta?: string;
  /** Round the wrapper. */
  rounded?: string;
  children: React.ReactNode;
}

/**
 * Wraps a section/card. When `locked=true`, blurs the content, dims it,
 * disables pointer events, and overlays a "Premium" pill + Unlock CTA that
 * opens the paywall modal.
 *
 * Premium users (passing locked=false) get a transparent passthrough.
 */
export function LockedBlock({
  locked,
  reason = "section_locked",
  label = "Unlock to continue",
  cta = "Unlock Premium",
  rounded = "rounded-3xl",
  children,
}: LockedBlockProps) {
  const { openPaywall } = usePaywall();

  if (!locked) return <>{children}</>;

  return (
    <div
      className={`relative isolate overflow-hidden ${rounded}`}
      data-testid="locked-block"
    >
      {/* Dimmed + blurred content (non-interactive) */}
      <div
        aria-hidden
        className="pointer-events-none select-none opacity-50 blur-[4px] saturate-75 transition"
      >
        {children}
      </div>

      {/* Glass overlay + CTA */}
      <button
        type="button"
        onClick={() => openPaywall(reason)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-amber-500/10 backdrop-blur-[2px] transition hover:from-purple-500/15 hover:via-pink-500/15 hover:to-amber-500/15"
        data-testid="locked-block-cta"
        aria-label={cta}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-white/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-purple-700 ring-1 ring-purple-500/30">
          <Lock className="h-3 w-3" />
          {label}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30">
          <Sparkles className="h-4 w-4" />
          {cta}
        </span>
      </button>
    </div>
  );
}
