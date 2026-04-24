import { Sparkles } from "lucide-react";

/**
 * Small "Try Free" pill shown on Parent Hub features the user hasn't used
 * yet (and isn't premium). Tells them this feature is free for one use.
 */
export function TryFreeBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full",
        "bg-emerald-100 dark:bg-emerald-500/20",
        "text-emerald-700 dark:text-emerald-300",
        "ring-1 ring-emerald-500/30",
        "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        className,
      ].join(" ")}
      data-testid="try-free-badge"
    >
      <Sparkles className="h-2.5 w-2.5" />
      Try Free
    </span>
  );
}
