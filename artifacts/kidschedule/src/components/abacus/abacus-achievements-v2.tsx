import { AnimatePresence, motion } from "framer-motion";
import { ACHIEVEMENTS_V2, type AchievementV2Id } from "@workspace/abacus";
import { cn } from "@/lib/utils";

export function AbacusAchievementsV2({
  earned,
  toastId,
  onDismissToast,
  showGrid = true,
}: {
  earned: AchievementV2Id[];
  toastId?: AchievementV2Id | null;
  onDismissToast?: () => void;
  showGrid?: boolean;
}) {
  const set = new Set(earned);
  const toast = toastId ? ACHIEVEMENTS_V2.find((a) => a.id === toastId) : null;

  return (
    <>
      {showGrid && (
        <div
          className="rounded-2xl border border-border bg-card p-3 space-y-2"
          data-testid="abacus-achievements-v2"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Achievements 2.0
          </p>
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {ACHIEVEMENTS_V2.map((a) => {
              const unlocked = set.has(a.id);
              return (
                <li
                  key={a.id}
                  className={cn(
                    "rounded-xl border px-1.5 py-2 text-center min-h-[72px]",
                    unlocked
                      ? "border-amber-400/40 bg-amber-500/10"
                      : "border-border bg-muted/30 opacity-50",
                  )}
                  data-testid={`abacus-ach-v2-${a.id}`}
                  title={a.hint}
                >
                  <span className="text-lg block" aria-hidden>
                    {unlocked ? a.emoji : "🔒"}
                  </span>
                  <span className="text-[9px] font-bold leading-tight block">{a.title}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl border-2 border-amber-400 bg-background px-4 py-3 shadow-lg max-w-xs text-center"
            data-testid="abacus-achievement-toast"
            role="status"
          >
            <p className="text-2xl" aria-hidden>
              {toast.emoji}
            </p>
            <p className="text-sm font-black">Unlocked: {toast.title}</p>
            <button
              type="button"
              className="mt-2 text-xs font-bold text-teal-700"
              onClick={onDismissToast}
            >
              Awesome!
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
