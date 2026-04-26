import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { AgeBand } from "@/lib/age-bands";
import { bandLabel, bandRangeLabel } from "@/lib/age-bands";
import { STAGE_MILESTONES } from "@/lib/stage-milestones";

/**
 * Fallback shown in "Explore Next Stage" when there are no exclusive
 * next-band sections to preview (typical for older kids whose features
 * already span all remaining bands). Gives parents an aspirational glimpse
 * of upcoming developmental milestones.
 */
export function StageMilestonesCard({
  childName,
  nextBand,
}: {
  childName: string;
  nextBand: AgeBand;
}) {
  const milestones = STAGE_MILESTONES[nextBand] ?? [];

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300/60 dark:border-amber-400/30 bg-gradient-to-br from-amber-50/60 to-rose-50/60 dark:from-amber-500/[0.06] dark:to-rose-500/[0.06] p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-500/20 dark:to-rose-500/20 flex items-center justify-center shrink-0 ring-1 ring-amber-300/40">
          <Sparkles className="h-5 w-5 text-amber-700 dark:text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="font-quicksand font-bold text-[15px] text-foreground leading-tight">
            What {childName} will love at {bandLabel(nextBand)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            A peek at the developmental wins coming up at {bandRangeLabel(nextBand)} —
            we grow with your child.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {milestones.map((m) => (
          <div
            key={m.title}
            className="rounded-xl bg-white/70 dark:bg-white/[0.04] border border-amber-200/60 dark:border-amber-400/20 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{m.emoji}</span>
              <span className="font-bold text-[13px] text-foreground">
                {m.title}
              </span>
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">
              {m.description}
            </p>
          </div>
        ))}
      </div>

      <Link href="/assistant">
        <button className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100">
          Ask Amy how to gently prepare {childName}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </Link>
    </div>
  );
}

/**
 * Shown when the child is in the highest band (no nextBand) — celebrates
 * that they've reached the full feature ceiling.
 */
export function GraduationStageCard({ childName }: { childName: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-300/60 dark:border-violet-400/30 bg-gradient-to-br from-violet-50/60 to-fuchsia-50/60 dark:from-violet-500/[0.06] dark:to-fuchsia-500/[0.06] p-5 text-center">
      <div className="text-3xl mb-2">🎓</div>
      <p className="font-quicksand font-bold text-[15px] text-foreground">
        {childName} has unlocked the full Parent Hub
      </p>
      <p className="text-[12px] text-muted-foreground mt-1.5">
        Every feature is now tuned to their stage — keep showing up, the rest
        is just consistency.
      </p>
    </div>
  );
}
