import { Star, Flame } from "lucide-react";
import type { RewardWallet } from "@workspace/learning-progress-engine";
import { emptyRewardsCopy } from "@workspace/learning-progress-engine";
import { PremiumCard, AnimatedCounter } from "./premium-polish";

export function RewardWalletStrip({ wallet }: { wallet: RewardWallet }) {
  const hasActivity = wallet.xp > 0 || wallet.streakDays > 0 || wallet.coins > 0;

  if (!hasActivity) {
    return (
      <PremiumCard testId="reward-wallet-strip">
        <p className="text-xs text-muted-foreground text-center py-3 px-4 leading-relaxed">
          {emptyRewardsCopy()}
        </p>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard testId="reward-wallet-strip">
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-amber-400/20 flex items-center justify-center shadow-inner">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Learning level</p>
            <p className="font-quicksand font-bold text-lg leading-none">
              <AnimatedCounter value={wallet.level} />
            </p>
          </div>
        </div>
        <div className="flex-1 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{wallet.xp}</span> XP
          </span>
          {wallet.coins > 0 && (
            <span>
              <span className="font-semibold text-foreground tabular-nums">{wallet.coins}</span>{" "}
              coins
            </span>
          )}
          {wallet.streakDays > 0 && (
            <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <Flame className="h-3.5 w-3.5" />
              <span className="font-semibold tabular-nums">{wallet.streakDays}</span>d rhythm
            </span>
          )}
        </div>
      </div>
    </PremiumCard>
  );
}
