/**
 * RoutineAdaptationsCard — "Why this routine?" surface.
 *
 * Formats adaptation strings for parents (strips legacy debug tokens).
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, ShieldCheck } from "lucide-react";
import {
  buildFamilyIntelligenceSurface,
  type FamilyIntelligenceContext,
} from "@/lib/family-intelligence-surface";
import { FamilyTrustStrip } from "@/components/intelligence/family-trust-strip";

const GROUP_LABELS = {
  context: "Today's context",
  environment: "Environment",
  behavior: "Family rhythm",
  adjustments: "Gentle changes",
} as const;

export function RoutineAdaptationsCard({
  adaptations,
  hasSchool,
  isWeekendDay,
  mood,
  energyProfile,
  compact = false,
}: {
  adaptations: readonly string[] | null | undefined;
  hasSchool?: boolean;
  isWeekendDay?: boolean;
  mood?: string;
  energyProfile?: FamilyIntelligenceContext["energyProfile"];
  compact?: boolean;
}) {
  const { t } = useTranslation();

  const surface = useMemo(() => {
    return buildFamilyIntelligenceSurface(adaptations, {
      hasSchool,
      isWeekendDay,
      mood,
      energyProfile,
    });
  }, [adaptations, hasSchool, isWeekendDay, mood, energyProfile]);

  const explanation = surface?.explanation;

  if (!explanation || explanation.bullets.length === 0) return null;

  if (compact && surface) {
    return (
      <Card className="rounded-2xl border border-primary/15 shadow-sm bg-primary/5">
        <CardContent className="p-4 flex flex-col gap-2">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0" aria-hidden />
            {t("intelligence.adaptations.title", { defaultValue: "Why this routine?" })}
          </p>
          <FamilyTrustStrip surface={surface} compact />
          <p className="text-[11px] leading-snug text-muted-foreground">{surface.reassurance}</p>
        </CardContent>
      </Card>
    );
  }

  const sections = (
    ["context", "environment", "behavior", "adjustments"] as const
  ).filter((g) => explanation.grouped[g].length > 0);

  return (
    <Card className="rounded-3xl border border-primary/15 shadow-sm bg-gradient-to-br from-primary/10 via-card to-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="font-quicksand text-base font-bold text-foreground">
                {t("intelligence.adaptations.title", { defaultValue: "Why this routine?" })}
              </h3>
            </div>
            <p className="text-sm font-medium text-foreground">{explanation.summary}</p>
          </div>
          <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </div>
        </div>

        {surface ? <FamilyTrustStrip surface={surface} compact={compact} /> : null}

        {sections.length > 1 ? (
          <div className="space-y-3">
            {sections.map((group) => (
              <div key={group}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                  {t(`intelligence.adaptations.group_${group}`, {
                    defaultValue: GROUP_LABELS[group],
                  })}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {explanation.grouped[group].map((s, i) => (
                    <li
                      key={`${group}-${i}`}
                      className="text-sm text-foreground bg-muted rounded-xl px-3 py-2 border border-border leading-snug"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {explanation.bullets.map((s, i) => (
              <li
                key={i}
                className="text-sm text-foreground bg-muted rounded-xl px-3 py-2 border border-border leading-snug"
              >
                {s}
              </li>
            ))}
          </ul>
        )}

        {surface?.reassurance ? (
          <p className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            {surface.reassurance}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
