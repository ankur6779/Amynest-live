import { AppLink } from "@/components/app-link";
import { BookOpen, CalendarCheck, ArrowRight } from "lucide-react";

type Props = {
  childName?: string | null;
  routineId?: number;
};

/**
 * Non-modal next steps after first routine — save, revisit, explore hub.
 * Evidence: Parent Hub users retain 5× better on D1.
 */
export function FirstValuePostRoutineStrip({ childName, routineId }: Props) {
  const name = childName ?? "your child";

  return (
    <div
      className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3"
      data-testid="first-value-post-routine-strip"
    >
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-100">
        <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
        Routine ready for {name}
      </p>
      <p className="mb-3 text-xs text-white/65">
        Mark tasks as you go — come back tomorrow and Amy will help you plan the next day.
      </p>
      <div className="flex flex-wrap gap-2">
        {routineId != null ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            Saved automatically
          </span>
        ) : null}
        <AppLink
          href="/parenting-hub"
          className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
          data-testid="first-value-hub-link"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Explore Parent Hub
          <ArrowRight className="h-3 w-3" aria-hidden />
        </AppLink>
      </div>
    </div>
  );
}
