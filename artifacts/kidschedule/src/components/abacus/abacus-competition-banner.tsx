import type { WeeklyEvent } from "@workspace/abacus";

export function AbacusCompetitionBanner({ event }: { event: WeeklyEvent }) {
  return (
    <div
      className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 space-y-0.5"
      data-testid="abacus-competition-banner"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
        {event.title} · Ages {event.bracket}
      </p>
      <p className="text-[11px] text-muted-foreground">{event.blurb}</p>
      <p className="text-[10px] font-semibold">Season reward: {event.seasonReward}</p>
    </div>
  );
}
