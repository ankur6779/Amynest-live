import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type HubExpandedChildrenProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

const EXPAND_EASE = [0.22, 1, 0.36, 1] as const;

/** Height + fade + slide for hub section child panels (expand/collapse). */
export function HubExpandedChildren({ open, children, className }: HubExpandedChildrenProps) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="hub-expanded-children"
          initial={reducedMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reducedMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
          transition={
            reducedMotion
              ? { duration: 0.15 }
              : { duration: 0.24, ease: EXPAND_EASE }
          }
          className="overflow-hidden"
        >
          <motion.div
            initial={reducedMotion ? false : { y: 8 }}
            animate={{ y: 0 }}
            exit={reducedMotion ? undefined : { y: 8 }}
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : { duration: 0.24, ease: EXPAND_EASE }
            }
            className={cn("hub-expanded-panel", className)}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
