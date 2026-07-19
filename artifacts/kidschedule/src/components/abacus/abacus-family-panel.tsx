import { FAMILY_CHALLENGES, weekendFamilyChallenge, type FamilyChallenge } from "@workspace/abacus";
import { todayDateKey } from "@/components/abacus/abacus-storage";
import { cn } from "@/lib/utils";

export function AbacusFamilyPanel({
  completedIds,
  onStart,
  onMarkDone,
}: {
  completedIds: string[];
  onStart: (challenge: FamilyChallenge) => void;
  onMarkDone: (id: string) => void;
}) {
  const featured = weekendFamilyChallenge(todayDateKey());
  const done = new Set(completedIds);

  return (
    <div
      className="rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-500/10 to-background p-3 space-y-2"
      data-testid="abacus-family-panel"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">
        Family Experience
      </p>
      <p className="text-xs text-muted-foreground">
        Practice together — shared progress, no pay-to-win.
      </p>
      <ul className="space-y-1.5">
        {[featured, ...FAMILY_CHALLENGES.filter((c) => c.id !== featured.id)].map((c) => {
          const isDone = done.has(c.id);
          return (
            <li key={c.id}>
              <div
                className={cn(
                  "rounded-xl border px-2.5 py-2 min-h-[52px]",
                  isDone ? "border-emerald-400/40 bg-emerald-500/10" : "border-border bg-card",
                )}
                data-testid={`abacus-family-${c.id}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg" aria-hidden>
                    {isDone ? "✅" : c.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground">{c.blurb}</p>
                    <p className="text-[10px] font-semibold mt-0.5">Parent: {c.parentHint}</p>
                  </div>
                </div>
                {!isDone && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onStart(c)}
                      className="flex-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold py-2 min-h-[40px]"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkDone(c.id)}
                      className="rounded-lg border border-border px-3 text-[11px] font-bold min-h-[40px]"
                    >
                      Done
                    </button>
                  </div>
                )}
                {isDone && (
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    Reward: {c.rewardLabel}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
