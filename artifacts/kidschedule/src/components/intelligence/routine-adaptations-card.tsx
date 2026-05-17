/**
 * RoutineAdaptationsCard — "Why this routine?" surface.
 *
 * Formats adaptation strings for parents (strips legacy debug tokens).
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { formatParentRoutineExplanation } from "@/lib/routine-parent-explanation";

const GROUP_LABELS = {
  context: "Context",
  environment: "Environment",
  behavior: "Your child",
  adjustments: "Adjustments",
} as const;

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

  const explanation = useMemo(() => {
    const raw = (adaptations ?? []).filter((s) => typeof s === "string" && s.trim().length > 0);
    if (raw.length === 0) return null;
    return formatParentRoutineExplanation(raw, {
      hasSchool,
      isWeekendDay,
      mood,
    });
  }, [adaptations, hasSchool, isWeekendDay, mood]);

  if (!explanation || explanation.bullets.length === 0) return null;

  const sections = (
    ["context", "environment", "behavior", "adjustments"] as const
  ).filter((g) => explanation.grouped[g].length > 0);

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-quicksand text-base font-bold text-foreground">
            {t("intelligence.adaptations.title", { defaultValue: "Why this routine?" })}
          </h3>
        </div>
        <p className="text-sm font-medium text-foreground">{explanation.summary}</p>

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
      </CardContent>
    </Card>
  );
}
