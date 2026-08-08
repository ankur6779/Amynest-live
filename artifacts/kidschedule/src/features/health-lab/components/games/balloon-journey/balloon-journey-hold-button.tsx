import type { PointerEvent, ReactNode, RefObject } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { isHealthLabLivingV1Enabled } from "@/lib/health-lab/living-room";

export function BalloonJourneyHoldButton({
  holding,
  disabled,
  buttonRef,
  ariaLabel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  children,
}: {
  holding: boolean;
  disabled?: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  ariaLabel: string;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const living = isHealthLabLivingV1Enabled();

  return (
    <div className="relative flex h-[8.5rem] w-[8.5rem] items-center justify-center">
      {!living && !reduced && holding && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`ripple-${i}`}
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-cyan-300/40"
              initial={{ scale: 0.85, opacity: 0.7 }}
              animate={{ scale: 1.8 + i * 0.3, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.35, ease: "easeOut" }}
              aria-hidden
            />
          ))}
        </>
      )}

      {!living && (
        <>
          <div
            className={cn(
              "pointer-events-none absolute h-44 w-44 rounded-full border border-cyan-300/20 transition-all duration-300",
              holding ? "scale-100 opacity-80" : "scale-90 opacity-40",
            )}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute h-36 w-36 rounded-full border border-violet-300/25 transition-all duration-300",
              holding ? "scale-105 opacity-90" : "scale-95 opacity-50",
            )}
            aria-hidden
          />
        </>
      )}

      <motion.button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        data-holding={holding ? "true" : "false"}
        className={cn(
          "relative flex touch-none select-none items-center justify-center rounded-full will-change-transform",
          living
            ? "hl-living-deep-hold"
            : cn(
                "h-32 w-32 border border-white/25 bg-gradient-to-br from-cyan-300 via-violet-500 to-fuchsia-600",
                "health-lab-glow-pulse health-lab-cta-premium",
                "shadow-[0_0_50px_rgba(139,92,246,0.75)]",
                holding && "border-cyan-200/40 shadow-[0_0_80px_rgba(34,211,238,0.95)]",
              ),
        )}
        animate={
          living
            ? { scale: holding ? 0.96 : 1 }
            : reduced
              ? { scale: holding ? 0.96 : 1 }
              : {
                  scale: holding ? 0.92 : 1,
                  boxShadow: holding
                    ? "0 0 80px rgba(34,211,238,0.95), 0 0 120px rgba(139,92,246,0.5)"
                    : "0 0 50px rgba(139,92,246,0.75)",
                }
        }
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        aria-label={ariaLabel}
      >
        <span className="relative z-[1]">{children}</span>
      </motion.button>
    </div>
  );
}
