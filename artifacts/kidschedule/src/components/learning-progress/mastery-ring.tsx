import { cn } from "@/lib/utils";

interface MasteryRingProps {
  score: number;
  size?: number;
  className?: string;
  label?: string;
  parentHub?: boolean;
}

export function MasteryRing({
  score,
  size = 56,
  className,
  label = "Mastery",
  parentHub = false,
}: MasteryRingProps) {
  const pct = Math.min(100, Math.max(0, score));
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const gradientId = "hub-mastery-ring-gradient";

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
      data-testid="mastery-ring"
    >
      <svg width={size} height={size} className="-rotate-90">
        {parentHub && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className={parentHub ? "text-white/10" : "text-muted/30"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={parentHub ? `url(#${gradientId})` : "currentColor"}
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-700",
            !parentHub && "text-primary",
            parentHub && "drop-shadow-[0_0_12px_rgba(236,72,153,0.35)]",
          )}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-sm font-semibold",
          parentHub && "bg-gradient-to-br from-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent",
        )}
        aria-label={`${label} ${pct}%`}
      >
        {pct}
      </span>
      {label && (
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground opacity-75">
          {label}
        </span>
      )}
    </div>
  );
}
