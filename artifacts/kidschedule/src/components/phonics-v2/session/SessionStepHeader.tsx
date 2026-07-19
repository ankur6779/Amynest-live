import { cn } from "@/lib/utils";
import type { DailySessionState } from "@/lib/phonics-v3/daily-session";
import { sessionProgressLabel } from "@/lib/phonics-v3/daily-session";

type SessionStepHeaderProps = {
  session: DailySessionState;
  className?: string;
};

export function SessionStepHeader({ session, className }: SessionStepHeaderProps) {
  const progress = sessionProgressLabel(session);

  return (
    <div
      className={cn("space-y-2", className)}
      data-testid="daily-session-step-header"
      aria-live="polite"
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-primary">
        Step {progress.stepNumber} of {progress.total}
      </p>
      <h2 className="font-quicksand text-lg font-black leading-tight">
        {progress.shortLabel}
      </h2>
      <div className="flex items-center gap-2" aria-label="Session progress">
        {progress.dots.map((dot, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              dot === "done" && "bg-emerald-500",
              dot === "current" && "bg-primary ring-2 ring-primary/30",
              dot === "todo" && "bg-muted-foreground/25",
            )}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
