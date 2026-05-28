import { cn } from "@/lib/utils";

interface MasteryRingProps {
  score: number;
  size?: number;
  className?: string;
  label?: string;
}

export function MasteryRing({
  score,
  size = 56,
  className,
  label = "Mastery",
}: MasteryRingProps) {
  const pct = Math.min(100, Math.max(0, score));
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
      data-testid="mastery-ring"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-semibold"
        aria-label={`${label} ${pct}%`}
      >
        {pct}
      </span>
      {label && (
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
