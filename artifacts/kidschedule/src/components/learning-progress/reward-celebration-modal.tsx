import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { RewardEvent } from "@workspace/learning-progress-engine";
import { greatJobMoment } from "@workspace/learning-progress-engine";
import {
  SoftCelebrationBurst,
  StarBurst,
  fadeUp,
  PREMIUM_EASE,
  useLearningRewardFx,
} from "./premium-polish";

interface RewardCelebrationModalProps {
  events: RewardEvent[];
  open: boolean;
  onClose: () => void;
}

export function RewardCelebrationModal({
  events,
  open,
  onClose,
}: RewardCelebrationModalProps) {
  const [burst, setBurst] = useState(0);
  const [star, setStar] = useState(false);
  const sfx = useLearningRewardFx();
  const primary = events.find((e) => e.type === "level_up") ?? events[0];

  useEffect(() => {
    if (open && events.length > 0) {
      setBurst((c) => c + 1);
      setStar(true);
      sfx.reset();
      if (events.some((e) => e.type === "level_up")) sfx.playLevelUp();
      else sfx.playUnlock();
      const t = window.setTimeout(() => setStar(false), 1400);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, events]);

  if (!primary) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md overflow-visible border-primary/20 bg-gradient-to-b from-card to-primary/[0.06] shadow-[0_24px_60px_-20px_rgba(99,102,241,0.35)]"
        data-testid="reward-celebration-modal"
      >
        <div className="relative py-1">
          <SoftCelebrationBurst trigger={burst} />
          <StarBurst active={star} />
          <DialogHeader>
            <p className="text-xs font-medium text-primary/80 text-center mb-1">
              {greatJobMoment()}
            </p>
            <DialogTitle className="flex flex-col items-center gap-2 text-xl font-quicksand text-center">
              <motion.span
                className="text-4xl"
                aria-hidden
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={PREMIUM_EASE}
              >
                {primary.emoji}
              </motion.span>
              {primary.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-3 text-center leading-relaxed">
            {primary.message}
          </p>
          {events.length > 1 && (
            <ul className="mt-5 space-y-2">
              {events.map((e, i) => (
                <motion.li
                  key={`${e.type}-${e.title}`}
                  {...fadeUp}
                  transition={{ ...PREMIUM_EASE, delay: 0.08 * i }}
                  className="flex items-center gap-2 text-sm rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5"
                >
                  <span aria-hidden>{e.emoji}</span>
                  <span className="font-medium">{e.title}</span>
                </motion.li>
              ))}
            </ul>
          )}
          <Button className="w-full mt-6 rounded-full shadow-sm" onClick={onClose}>
            Lovely — keep going
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
