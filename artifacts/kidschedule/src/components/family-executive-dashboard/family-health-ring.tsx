interface FamilyHealthRingProps {
  score: number;
  trendLabel: string;
  trend7d: number;
  size?: number;
  className?: string;
}

export function FamilyHealthRing({
  score,
  trendLabel,
  trend7d,
  size = 88,
  className = "",
}: FamilyHealthRingProps) {
  const stroke = Math.max(4, Math.round(size * 0.075));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const offset = c * (1 - safe / 100);
  const gradientId = `hub-health-ring-${size}`;

  const trendText =
    trend7d >= 5 ? `+${trend7d}` : trend7d <= -5 ? `${trend7d}` : "±0";

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Family health ${safe} out of 100, trend ${trendLabel}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--brand-purple-500))" />
            <stop offset="50%" stopColor="hsl(var(--brand-pink-500))" />
            <stop offset="100%" stopColor="hsl(var(--brand-emerald-500))" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-black tabular-nums text-white leading-none"
          style={{ fontSize: Math.max(14, Math.round(size * 0.26)) }}
        >
          {safe}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wide text-white/70 mt-0.5">
          {trendText}
        </span>
      </div>
    </div>
  );
}
