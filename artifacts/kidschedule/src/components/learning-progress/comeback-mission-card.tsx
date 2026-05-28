import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ComebackMission } from "@workspace/learning-progress-engine";
import { PremiumCard, fadeUp, PREMIUM_EASE } from "./premium-polish";

export function ComebackMissionCard({ mission }: { mission: ComebackMission }) {
  return (
    <PremiumCard glow testId="comeback-mission">
      <motion.div {...fadeUp} transition={PREMIUM_EASE} className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {mission.emoji}
          </span>
          <h3 className="font-quicksand font-semibold text-base leading-snug">{mission.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{mission.message}</p>
        {mission.surpriseUnlock && (
          <p className="text-xs font-medium text-primary rounded-lg bg-primary/5 px-3 py-2 border border-primary/10">
            🎁 {mission.surpriseUnlock}
          </p>
        )}
        {mission.bonusCoins > 0 && (
          <p className="text-xs text-muted-foreground">
            A warm welcome bonus when you return
          </p>
        )}
        <Link href={mission.href}>
          <Button size="sm" className="rounded-full w-full min-h-10 active:scale-[0.98] transition-transform">
            {mission.ctaLabel}
          </Button>
        </Link>
      </motion.div>
    </PremiumCard>
  );
}
