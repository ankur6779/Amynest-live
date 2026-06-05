import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  contentRevealContainer,
  contentRevealItem,
  heroReveal,
} from "@/lib/experience-system";
import { performanceTier } from "@/lib/performance-tier";
import { cn } from "@/lib/utils";

type HeroProps = {
  children: ReactNode;
  className?: string;
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
};

type ItemProps = {
  children: ReactNode;
  className?: string;
};

function useMotionEnabled(): boolean {
  const reduced = useReducedMotion();
  if (reduced) return false;
  return performanceTier() !== "low";
}

/** Hero-first entrance — use once per screen above staggered content. */
function Hero({ children, className }: HeroProps) {
  const motionOn = useMotionEnabled();
  if (!motionOn) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={heroReveal}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

/** Stagger container — wrap card stacks / list sections. */
function Stagger({ children, className }: StaggerProps) {
  const motionOn = useMotionEnabled();
  if (!motionOn) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={contentRevealContainer}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

/** Single stagger child. */
function Item({ children, className }: ItemProps) {
  const motionOn = useMotionEnabled();
  if (!motionOn) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={cn(className)} variants={contentRevealItem}>
      {children}
    </motion.div>
  );
}

export const ContentReveal = { Hero, Stagger, Item };
