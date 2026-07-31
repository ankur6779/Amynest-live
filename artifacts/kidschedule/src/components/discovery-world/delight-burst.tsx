import { AnimatePresence, motion } from "framer-motion";
import { StarBurst } from "@/components/learning-progress/premium-polish";
import { clampForTier, TRANSITION } from "@/lib/experience-system";
import { useReducedMotion } from "@/lib/reduced-motion";
import { ConfettiReward } from "./sound-world-motion";

type DelightBurstProps = {
  active: boolean;
  variant?: "sparkle" | "star" | "confetti";
  onDone?: () => void;
};

export function DelightBurst({ active, variant = "star", onDone }: DelightBurstProps) {
  const reduced = useReducedMotion();
  const intensity = clampForTier("card");

  if (reduced || intensity === "subtle") {
    return (
      <AnimatePresence onExitComplete={onDone}>
        {active ? <span className="sr-only">Celebration</span> : null}
      </AnimatePresence>
    );
  }

  if (variant === "confetti") {
    return <ConfettiReward active={active} onDone={onDone} intensity="full" />;
  }

  return (
    <AnimatePresence onExitComplete={onDone}>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TRANSITION.micro}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          aria-hidden
        >
          {variant === "star" && <StarBurst active />}
          {variant === "sparkle" && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-6xl"
            >
              ✨
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
