/**
 * Calm Amy AI mark for the conversation workspace.
 * Warm companion — not neon, not a toy orb, not a ChatGPT knot.
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
      <circle cx="16" cy="16" r="15.25" fill="currentColor" opacity="0.08" />
      <circle cx="16" cy="16" r="12.25" fill="#F3E4D0" />
      <circle
        cx="16"
        cy="16"
        r="12.25"
        fill="none"
        stroke="#3A2A22"
        strokeOpacity="0.28"
        strokeWidth="1"
      />
      <ellipse cx="16" cy="12.2" rx="5.5" ry="2.6" fill="#fff" opacity="0.28" />
      <circle cx="12.55" cy="15.7" r="1.05" fill="#1F1511" />
      <circle cx="19.45" cy="15.7" r="1.05" fill="#1F1511" />
      <path
        d="M13.55 19.55c1.45 1 3.45 1 4.9 0"
        fill="none"
        stroke="#6B4636"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}
