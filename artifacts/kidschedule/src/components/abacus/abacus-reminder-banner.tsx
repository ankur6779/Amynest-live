import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function reminderCopyForGap(daysAway: number): string | null {
  if (daysAway <= 0) return null;
  if (daysAway === 1) return "Your Abacus is waiting.";
  if (daysAway <= 3) return "Let's protect your streak.";
  if (daysAway <= 6) return "Let's protect your streak.";
  return "Resume with an easier session.";
}

export function AbacusReminderBanner({
  daysAway,
  onResume,
  easier = false,
  className,
}: {
  daysAway: number;
  onResume: () => void;
  easier?: boolean;
  className?: string;
}) {
  const copy = reminderCopyForGap(daysAway);
  if (!copy) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-orange-400/40 bg-orange-500/10 px-3 py-2.5 flex items-center gap-2",
        className,
      )}
      data-testid="abacus-reminder-banner"
      role="status"
    >
      <Flame className="h-4 w-4 text-orange-500 shrink-0" />
      <p className="flex-1 text-xs font-semibold text-foreground min-w-0">{copy}</p>
      <button
        type="button"
        onClick={onResume}
        className="shrink-0 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-[11px] font-bold px-3 py-2 min-h-[40px]"
        data-testid="abacus-reminder-resume"
      >
        {easier || daysAway >= 7 ? "Easy start" : "Resume"}
      </button>
    </div>
  );
}
