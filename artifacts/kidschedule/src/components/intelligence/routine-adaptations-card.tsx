/**
 * RoutineAdaptationsCard — "Why this routine?" surface.
 *
 * Renders the deterministic adaptation strings emitted by the routine
 * generator (server-side, see `lib/routineAdaptations.ts`). When the
 * routine has no adaptations (e.g. legacy routine row), the card is hidden.
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export function RoutineAdaptationsCard({
  adaptations,
}: {
  adaptations: readonly string[] | null | undefined;
}) {
  const { t } = useTranslation();
  const list = (adaptations ?? []).filter((s) => typeof s === "string" && s.trim().length > 0);
  if (list.length === 0) return null;

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-quicksand text-base font-bold text-foreground">
            {t("intelligence.adaptations.title")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("intelligence.adaptations.subtitle")}</p>
        <ul className="flex flex-col gap-2 pt-1">
          {list.map((s, i) => (
            <li
              key={i}
              className="text-sm text-foreground bg-muted rounded-xl px-3 py-2 border border-border"
            >
              {s}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
