import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const milestones = STAGE_MILESTONES[nextBand] ?? [];

  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-card flex items-center justify-center shrink-0 ring-1 ring-primary">
          <Sparkles className="h-5 w-5 text-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-quicksand font-bold text-[15px] text-foreground leading-tight">
            {t("parent_hub.stage_milestones.title", { name: childName, band: bandLabel(nextBand) })}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t("parent_hub.stage_milestones.description", { range: bandRangeLabel(nextBand) })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {milestones.map((m) => (
          <div
            key={m.title}
            className="rounded-xl bg-card border border-border px-3 py-2.5"
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
        <button className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground hover:text-foreground">
          {t("parent_hub.stage_milestones.cta", { name: childName })}
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
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-5 text-center">
      <div className="text-3xl mb-2">🎓</div>
      <p className="font-quicksand font-bold text-[15px] text-foreground">
        {t("parent_hub.graduation.title", { name: childName })}
      </p>
      <p className="text-[12px] text-muted-foreground mt-1.5">
        {t("parent_hub.graduation.desc")}
      </p>
    </div>
  );
}
