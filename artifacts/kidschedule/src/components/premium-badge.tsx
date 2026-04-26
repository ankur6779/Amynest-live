import { Sparkles } from "lucide-react";

interface PremiumBadgeProps {
  className?: string;
  onClick?: () => void;
  label?: string;
}

/**
 * Small "Premium" pill shown on Parent Hub features the user has already
 * consumed their one free use of. Visual counterpart to <TryFreeBadge />.
 *
 * When `onClick` is provided, the pill is rendered as a button that opens
 * the paywall. Otherwise it's a static informational badge.
 */
export function PremiumBadge({
  className = "",
  onClick,
  label = "Premium",
}: PremiumBadgeProps) {
  const classes = [
    "inline-flex items-center gap-1 rounded-full",
    "bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500",
    "text-white",
    "shadow-md shadow-purple-500/30",
    "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
    onClick ? "cursor-pointer hover:brightness-110 transition" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={classes}
        data-testid="premium-badge"
        aria-label={`${label} feature — tap to upgrade`}
      >
        <Sparkles className="h-2.5 w-2.5" />
        {label}
      </button>
    );
  }

  return (
    <span className={classes} data-testid="premium-badge">
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
