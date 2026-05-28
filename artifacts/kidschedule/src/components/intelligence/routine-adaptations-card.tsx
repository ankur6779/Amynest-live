/**
 * RoutineAdaptationsCard — "Why this routine?" surface.
 *
 * Formats adaptation strings for parents (strips legacy debug tokens).
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Heart, Lightbulb, ShieldCheck } from "lucide-react";
import { buildFamilyIntelligenceSurface, type FamilyTrustSignalId } from "@/lib/family-intelligence-surface";

const GROUP_LABELS = {
  context: "Today's context",
  environment: "Environment",
  behavior: "Family rhythm",
  adjustments: "Gentle changes",
} as const;

const TRUST_ICONS: Record<FamilyTrustSignalId, typeof Brain> = {
  remembers: Brain,
  adapts: Lightbulb,
  supports: Heart,
};

export function RoutineAdaptationsCard({
  adaptations,
  hasSchool,
  isWeekendDay,
  mood,
}: {
  adaptations: readonly string[] | null | undefined;
  hasSchool?: boolean;
  isWeekendDay?: boolean;
  mood?: string;
}) {
  const { t } = useTranslation();

  const surface = useMemo(() => {
    return buildFamilyIntelligenceSurface(adaptations, {
      hasSchool,
      isWeekendDay,
      mood,
    });
  }, [adaptations, hasSchool, isWeekendDay, mood]);

  const explanation = surface?.explanation;

  if (!explanation || explanation.bullets.length === 0) return null;

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

        {surface?.signals.length ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {surface.signals.map((signal) => {
              const Icon = TRUST_ICONS[signal.id];
              return (
                <div
                  key={signal.id}
                  className="rounded-2xl border border-border/70 bg-background/65 px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <p className="text-xs font-bold text-foreground">{signal.label}</p>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                    {signal.detail}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}

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
