import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PulseCtaProps = {
  children: ReactNode;
  /** When true, wraps children in a soft pulse ring to show “tap here” */
  active?: boolean;
  className?: string;
};

/**
 * Highlights the single primary action on a screen for young children.
 */
export function PulseCta({ children, active = true, className }: PulseCtaProps) {
  return (
    <div
      className={cn(
        "relative inline-flex w-full max-w-md justify-center",
        active && "phonics-pulse-cta",
        className,
      )}
      data-testid="pulse-cta"
      data-active={active ? "true" : "false"}
    >
      {children}
      <style>{`
        @keyframes phonics-cta-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
          50% { box-shadow: 0 0 0 12px rgba(245, 158, 11, 0); }
        }
        .phonics-pulse-cta > button,
        .phonics-pulse-cta > [role="button"] {
          animation: phonics-cta-pulse 1.8s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .phonics-pulse-cta > button,
          .phonics-pulse-cta > [role="button"] {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
