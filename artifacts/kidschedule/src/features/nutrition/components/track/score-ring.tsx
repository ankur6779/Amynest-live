import { cn } from "@/lib/utils";
import { scoreColor, scoreRingGlow, scoreRingStroke } from "@/features/nutrition/lib/score-colors";

export function ScoreRing({
  score,
  size = 112,
  strokeWidth = 10,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", scoreRingGlow(clamped), className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Nutrition score ${clamped} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className="stroke-muted/40"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className={cn(scoreRingStroke(clamped), "transition-all duration-500 ease-out")}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-black tabular-nums",
          scoreColor(clamped),
          size >= 100 ? "text-3xl" : "text-2xl",
        )}
      >
        {clamped}
      </span>
    </div>
  );
}
