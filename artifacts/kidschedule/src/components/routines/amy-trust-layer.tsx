import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useListRoutines, getListRoutinesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { resolveFamilyIntelligenceSurface } from "@/lib/family-intelligence-surface";
import { FamilyTrustStrip } from "@/components/intelligence/family-trust-strip";

const INPUT_KEYS = [
  { key: "pages.routines.index.amy_uses_mood", defaultValue: "mood" },
  { key: "pages.routines.index.amy_uses_weather", defaultValue: "weather" },
  { key: "pages.routines.index.amy_uses_school", defaultValue: "school schedule" },
  { key: "pages.routines.index.amy_uses_past", defaultValue: "past routines" },
] as const;

export function AmyTrustLayer() {
  const { t } = useTranslation();
  const { data: routines } = useListRoutines(undefined, {
    query: { queryKey: getListRoutinesQueryKey() },
  });

  const surface = useMemo(() => {
    const list = (routines ?? []) as Array<{
      id: number;
      childName?: string;
      date?: string;
      adaptations?: string[] | null;
    }>;
    return resolveFamilyIntelligenceSurface({ routines: list });
  }, [routines]);

  if (surface) {
    return (
      <Card className="rounded-2xl border border-primary/15 bg-primary/5 shadow-none">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            {t("pages.routines.index.amy_adapts_title", {
              defaultValue: "Amy adapts to your family",
            })}
          </p>
          <FamilyTrustStrip surface={surface} compact />
          <p className="text-[11px] leading-snug text-muted-foreground">{surface.reassurance}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-primary/15 bg-primary/5 shadow-none">
      <CardContent className="p-4">
        <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          {t("pages.routines.index.amy_will_use", { defaultValue: "Amy will use:" })}
        </p>
        <ul className="flex flex-wrap gap-2">
          {INPUT_KEYS.map((item) => (
            <li
              key={item.key}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-card border border-border text-foreground"
            >
              {t(item.key, { defaultValue: item.defaultValue })}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
          {t("pages.routines.index.amy_learning_hint", {
            defaultValue: "Generate and save your first routine — Amy starts remembering from there.",
          })}
        </p>
      </CardContent>
    </Card>
  );
}
