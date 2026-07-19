import { motion, AnimatePresence } from "framer-motion";
import type { BossDef } from "@workspace/abacus";
import { cn } from "@/lib/utils";

export function AbacusBossIntro({
  boss,
  open,
  onFight,
  onDismiss,
}: {
  boss: BossDef;
  open: boolean;
  onFight: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="abacus-boss-title"
          data-testid="abacus-boss-intro"
        >
          <motion.div
            initial={{ y: 40, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className={cn(
              "w-full max-w-md rounded-2xl border-2 border-amber-400/50",
              "bg-gradient-to-br from-amber-500/20 via-background to-rose-500/10 p-4 space-y-3 shadow-xl",
            )}
          >
            <p className="text-4xl text-center" aria-hidden>
              {boss.emoji}
            </p>
            <h2 id="abacus-boss-title" className="text-lg font-black text-center">
              {boss.name}
            </h2>
            <p className="text-sm text-center text-muted-foreground">{boss.intro}</p>
            <p className="text-xs text-center font-semibold">
              {boss.challengeCount} epic questions · Reward: {boss.rewardTitle}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold min-h-[44px]"
              >
                Later
              </button>
              <button
                type="button"
                onClick={onFight}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold py-3 min-h-[44px]"
                data-testid="abacus-boss-fight"
              >
                Fight Boss!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AbacusBossVictory({
  boss,
  open,
  onClose,
}: {
  boss: BossDef;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="abacus-boss-victory"
        >
          <motion.div
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            className="w-full max-w-sm rounded-2xl border-2 border-emerald-400/50 bg-background p-5 text-center space-y-3"
          >
            <p className="text-5xl" aria-hidden>
              🏆
            </p>
            <h2 className="text-lg font-black">Boss Defeated!</h2>
            <p className="text-sm text-muted-foreground">
              You earned the <strong>{boss.rewardTitle}</strong> from {boss.name}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-emerald-600 text-white font-bold py-3 min-h-[44px]"
            >
              Celebrate →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
