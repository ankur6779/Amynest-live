import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/experience-system";
import { cn } from "@/lib/utils";

export function CelebrationBurst({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={TRANSITION.springGentle}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          aria-hidden
        >
          <span className="text-6xl">⭐</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfettiDots({ active }: { active: boolean }) {
  if (!active) return null;
  const dots = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-full bg-primary"
          style={{ left: `${8 + i * 7}%`, top: "40%" }}
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: -48 - i * 4, opacity: 0 }}
          transition={{ duration: 0.9, delay: i * 0.04, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function CardLift({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={TRANSITION.springGentle}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function GridSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: rows * 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[180px] animate-pulse rounded-[24px] border border-white/10 bg-white/[0.04]"
        />
      ))}
    </div>
  );
}
