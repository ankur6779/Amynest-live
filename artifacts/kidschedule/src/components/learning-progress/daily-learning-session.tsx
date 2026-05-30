import { Link } from "wouter";
import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { DailyLearningSession } from "@workspace/learning-progress-engine";
import { consistencyLabel, emptySessionCopy } from "@workspace/learning-progress-engine";
import { PremiumCard, PremiumProgressRing, PREMIUM_EASE } from "./premium-polish";
import { ParentHubInfoBanner } from "./parent-hub-info-banner";

interface DailyLearningSessionCardProps {
  session: DailyLearningSession;
  childId: number;
  childName?: string;
  onStepComplete?: (stepId: string) => void;
  completing?: boolean;
  parentHub?: boolean;
}

export function DailyLearningSessionCard({
  session,
  childName = "your child",
  onStepComplete,
  completing = false,
  parentHub = false,
}: DailyLearningSessionCardProps) {
  const pct = Math.round((session.completedCount / session.totalCount) * 100);
  if (session.completedCount === 0 && !session.isComplete) {
    return (
      <PremiumCard
        parentHub={parentHub}
        testId="daily-learning-session"
      >
        {parentHub ? (
          <div className="p-3">
            <ParentHubInfoBanner
              icon="🚀"
              title="Daily Adventure"
              message={emptySessionCopy(childName)}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6 px-4 leading-relaxed">
            {emptySessionCopy(childName)}
          </p>
        )}
      </PremiumCard>
    );
  }

  return (
    <PremiumCard
      parentHub={parentHub}
      glow={session.isComplete && !parentHub}
      testId="daily-learning-session"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4 mb-4">
          <PremiumProgressRing pct={pct} label={`${session.completedCount}/${session.totalCount}`} />
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand font-semibold text-sm">Today&apos;s learning path</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {consistencyLabel(session.consistencyScore)}
            </p>
            <Progress value={pct} className="h-1.5 mt-3" />
          </div>
        </div>
        <div className="space-y-2">
          {session.items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...PREMIUM_EASE, delay: i * 0.04 }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                item.completed
                  ? "border-primary/20 bg-primary/5"
                  : "border-border/60 bg-card/50 hover:border-primary/20"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/60 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {item.emoji} {item.title}
                </p>
              </div>
              {!item.completed && (
                <div className="flex gap-1.5 shrink-0">
                  <Link href={item.href}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs min-h-9 min-w-[3rem] active:scale-95 transition-transform"
                    >
                      Go
                    </Button>
                  </Link>
                  {onStepComplete && (
                    <Button
                      size="sm"
                      className="rounded-full text-xs min-h-9 active:scale-95 transition-transform"
                      disabled={completing}
                      onClick={() => onStepComplete(item.id)}
                    >
                      Done
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </PremiumCard>
  );
}
