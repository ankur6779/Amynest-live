import { motion } from "framer-motion";
import { useMemo } from "react";
import { AmyIcon } from "@/components/amy-icon";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import {
  buildLivingCompanionLine,
  type LivingCompanionLine,
  type LivingCompanionSurface,
} from "@workspace/learning-progress-engine";
import { InsightCard } from "./premium-polish";
import { TRANSITION, TYPE } from "@/lib/experience-system";
import { cn } from "@/lib/utils";

interface AmyPresenceStripProps {
  surface: LivingCompanionSurface;
  childId?: number | null;
  /** Override line — when caller already has it ready. */
  line?: LivingCompanionLine | null;
  className?: string;
}

/**
 * Gentle, persistent Amy strip used across major screens.
 * Surfaces at most one calm line. Renders nothing when Amy has nothing to say.
 */
export function AmyPresenceStrip({
  surface,
  childId,
  line,
  className,
}: AmyPresenceStripProps) {
  const { profile, phase3, child } = useLearningProgress(childId);

  const resolved = useMemo<LivingCompanionLine | null>(() => {
    if (line !== undefined) return line;
    if (!profile || !phase3) return null;
    return buildLivingCompanionLine({
      surface,
      profile,
      memory: phase3.memory,
      childName: child?.name,
    });
  }, [line, profile, phase3, surface, child?.name]);

  if (!resolved) return null;

  const toneCls =
    resolved.tone === "celebrate"
      ? "text-primary"
      : "text-foreground/85";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TRANSITION.warm}
      className={className}
    >
      <InsightCard
        tone={resolved.tone === "celebrate" ? "celebrate" : "neutral"}
        testId="amy-presence-strip"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 pt-0.5">
            <AmyIcon size={26} />
          </div>
          <div className="min-w-0">
            <p className={cn(TYPE.micro, "text-primary/80 mb-0.5")}>Amy</p>
            <p className={cn("text-sm leading-relaxed", toneCls)}>{resolved.text}</p>
          </div>
        </div>
      </InsightCard>
    </motion.div>
  );
}
