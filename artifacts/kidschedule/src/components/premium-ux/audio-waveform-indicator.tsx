import { cn } from "@/lib/utils";
import { MOTION_MS } from "@/lib/experience-system";

type Props = {
  active?: boolean;
  completing?: boolean;
  className?: string;
  barCount?: number;
};

const BAR_HEIGHTS = [0.45, 0.75, 1, 0.6, 0.85, 0.55, 0.7];

/**
 * Mini waveform for audio playback — playing animates bars; completing fades gently.
 */
export function AudioWaveformIndicator({
  active = false,
  completing = false,
  className,
  barCount = 5,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-end justify-center gap-[2px] transition-opacity",
        completing ? "opacity-60" : "opacity-100",
        className,
      )}
      style={{ transitionDuration: `${MOTION_MS.normal}ms` }}
      aria-hidden
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-current transition-all",
            active && !completing && "premium-waveform-bar",
          )}
          style={{
            height: `${(BAR_HEIGHTS[i % BAR_HEIGHTS.length] ?? 0.6) * 12}px`,
            animationDelay: active ? `${i * 0.08}s` : undefined,
            transform: completing ? "scaleY(0.35)" : undefined,
            transitionDuration: `${MOTION_MS.normal}ms`,
          }}
        />
      ))}
    </span>
  );
}
