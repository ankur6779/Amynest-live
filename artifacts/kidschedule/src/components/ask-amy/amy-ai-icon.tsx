/**
 * Calm Amy AI mark for the conversation workspace.
 * Warm companion — not neon, not a toy orb, not a ChatGPT knot.
 * Features stay readable at 16–24px.
 */
import { cn } from "@/lib/utils";

export function AmyAIIcon({
  size = 28,
  className,
  decorative = true,
}: {
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("amy-ai-icon shrink-0", className)}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative}
      aria-label={decorative ? undefined : "Amy"}
    >
      <circle cx="16" cy="16" r="15.4" fill="currentColor" opacity="0.1" />
      <circle cx="16" cy="16" r="12.1" fill="#F4E6D4" />
      <circle
        cx="16"
        cy="16"
        r="12.1"
        fill="none"
        stroke="#3A2A22"
        strokeOpacity="0.32"
        strokeWidth="1.15"
      />
      <circle cx="12.35" cy="15.55" r="1.35" fill="#1F1511" />
      <circle cx="19.65" cy="15.55" r="1.35" fill="#1F1511" />
      <path
        d="M13.2 19.85c1.7 0.85 3.9 0.85 5.6 0"
        fill="none"
        stroke="#6B4636"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}
