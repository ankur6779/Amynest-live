/**
 * Phase 5 — ScreenShell: standardized page wrapper used across major
 * learning surfaces. Provides unified entrance motion, spacing rhythm, and
 * (optionally) an Amy presence strip. Does NOT introduce new state.
 */

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  SCREEN_SPACING,
  TRANSITION,
  TYPE,
  pageEnter,
} from "@/lib/experience-system";
import { AmyPresenceStrip } from "@/components/learning-progress/amy-presence-strip";
import type { LivingCompanionSurface } from "@workspace/learning-progress-engine";

interface ScreenShellProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** When set, renders the Amy presence strip for this surface. */
  amySurface?: LivingCompanionSurface;
  childId?: number | null;
  /** Right-aligned actions next to the title. */
  actions?: ReactNode;
  /** Renders an extra hero band above the main content. */
  hero?: ReactNode;
  /** Skip the standard top spacing (for embedded usage). */
  embedded?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  /** Optional override for the data-testid. */
  testId?: string;
}

export function ScreenShell({
  title,
  subtitle,
  amySurface,
  childId,
  actions,
  hero,
  embedded = false,
  className,
  contentClassName,
  children,
  testId = "screen-shell",
}: ScreenShellProps) {
  return (
    <motion.section
      data-testid={testId}
      variants={pageEnter}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={TRANSITION.warm}
      className={cn(
        "mx-auto w-full max-w-4xl",
        !embedded && SCREEN_SPACING.pageTop,
        !embedded && SCREEN_SPACING.pageBottom,
        SCREEN_SPACING.pageX,
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            {typeof title === "string" ? (
              <h1 className={TYPE.pageTitle}>{title}</h1>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {hero && <div className="mb-4">{hero}</div>}
      {amySurface && (
        <div className="mb-4">
          <AmyPresenceStrip surface={amySurface} childId={childId} />
        </div>
      )}
      <div className={cn(SCREEN_SPACING.stack, contentClassName)}>{children}</div>
    </motion.section>
  );
}
