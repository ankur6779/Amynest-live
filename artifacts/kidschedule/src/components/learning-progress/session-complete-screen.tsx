import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { CheckCircle2, Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RewardEvent, DailyUnlockItem } from "@workspace/learning-progress-engine";
import {
  sessionCompleteHeadline,
  greatJobMoment,
  tomorrowUnlockHeadline,
  tomorrowUnlockSubline,
  teaserForUnlock,
} from "@workspace/learning-progress-engine";
import {
  PremiumCard,
  PremiumProgressRing,
  SoftCelebrationBurst,
  AnimatedCounter,
  fadeUp,
  PREMIUM_EASE,
  useLearningRewardFx,
} from "./premium-polish";
import { TomorrowUnlocksCard } from "./tomorrow-unlocks";

interface SessionCompleteScreenProps {
  xpEarned: number;
  rewardEvents: RewardEvent[];
  tomorrowPreview: DailyUnlockItem[];
  childName: string;
  activitiesCompleted: number;
  activitiesTotal: number;
  streakDays: number;
  skillHighlight?: string | null;
  onClose: () => void;
}

export function SessionCompleteScreen({
  xpEarned,
  rewardEvents,
  tomorrowPreview,
  childName,
  activitiesCompleted,
  activitiesTotal,
  streakDays,
  skillHighlight,
  onClose,
}: SessionCompleteScreenProps) {
  const [burst, setBurst] = useState(0);
  const [step, setStep] = useState(0);
  const sfx = useLearningRewardFx();
  const pct = Math.round((activitiesCompleted / Math.max(1, activitiesTotal)) * 100);

  useEffect(() => {
    setBurst(1);
    sfx.playComplete();
    const t1 = window.setTimeout(() => setStep(1), 400);
    const t2 = window.setTimeout(() => setStep(2), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <PremiumCard glow testId="session-complete-screen" className="overflow-visible">
      <div className="relative px-6 pt-10 pb-8 text-center space-y-5">
        <SoftCelebrationBurst trigger={burst} />
        <motion.div {...fadeUp} transition={PREMIUM_EASE}>
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto drop-shadow-sm" />
        </motion.div>
        <motion.div {...fadeUp} transition={{ ...PREMIUM_EASE, delay: 0.1 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
            {greatJobMoment()}
          </p>
          <h2 className="font-quicksand text-2xl font-bold mt-1">
            {sessionCompleteHeadline(childName)}
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            Today&apos;s learning is complete — small steps become big confidence.
          </p>
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: step >= 1 ? 1 : 0 }}
          transition={PREMIUM_EASE}
        >
          <PremiumProgressRing pct={pct} label={`${activitiesCompleted}/${activitiesTotal}`} />
          <div className="text-left space-y-2">
            <p className="text-lg font-semibold text-primary flex items-center gap-1">
              +<AnimatedCounter value={xpEarned} className="tabular-nums" /> XP
            </p>
            {streakDays > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                {streakDays} day learning rhythm
              </p>
            )}
            {skillHighlight && (
              <p className="text-xs text-foreground/80 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Growing: {skillHighlight}
              </p>
            )}
          </div>
        </motion.div>

        {step >= 1 && rewardEvents.length > 0 && (
          <motion.ul
            className="text-left text-sm space-y-1.5 max-w-xs mx-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={PREMIUM_EASE}
          >
            {rewardEvents.map((e) => (
              <li
                key={e.title}
                className="flex gap-2 rounded-lg bg-primary/5 px-3 py-2 border border-primary/10"
              >
                <span aria-hidden>{e.emoji}</span>
                <span>{e.title}</span>
              </li>
            ))}
          </motion.ul>
        )}

        {step >= 2 && tomorrowPreview.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={PREMIUM_EASE}>
            <TomorrowUnlocksCard
              items={tomorrowPreview}
              childName={childName}
              compact
              headline={tomorrowUnlockHeadline()}
              subline={tomorrowUnlockSubline(childName)}
              teaser={teaserForUnlock}
            />
          </motion.div>
        )}

        <Link href="/parenting-hub">
          <Button className="rounded-full px-8 shadow-sm" onClick={onClose}>
            Back to Parent Hub
          </Button>
        </Link>
      </div>
    </PremiumCard>
  );
}
