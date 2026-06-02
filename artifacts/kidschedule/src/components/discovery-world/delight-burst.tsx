import { AnimatePresence, motion } from "framer-motion";
import { StarBurst } from "@/components/learning-progress/premium-polish";
import { clampForTier, TRANSITION } from "@/lib/experience-system";

type DelightBurstProps = {
  active: boolean;
  variant?: "sparkle" | "star" | "confetti";
  onDone?: () => void;
};

export function DelightBurst({ active, variant = "star", onDone }: DelightBurstProps) {
  const intensity = clampForTier("card");

  return (
    <AnimatePresence onExitComplete={onDone}>
      {active && intensity !== "subtle" && (
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
          {variant === "confetti" && intensity === "card" && (
            <div className="flex gap-2 text-3xl">
              {["🎉", "⭐", "🌟"].map((e, i) => (
                <motion.span
                  key={e}
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -24, opacity: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.9 }}
                >
                  {e}
                </motion.span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
