import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type HubExpandedChildrenProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

/** Fade + 8px slide for hub section child panels (expand/collapse). */
export function HubExpandedChildren({ open, children, className }: HubExpandedChildrenProps) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="hub-expanded-children"
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={
            reducedMotion
              ? { duration: 0.15 }
              : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
          }
          className={cn("hub-expanded-panel", className)}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
