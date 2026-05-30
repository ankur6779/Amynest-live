import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useListRoutines, getListRoutinesQueryKey } from "@workspace/api-client-react";
import { Sparkles } from "lucide-react";
import { resolveFamilyIntelligenceSurface } from "@/lib/family-intelligence-surface";
import { FamilyTrustStrip } from "@/components/intelligence/family-trust-strip";
import { HUB_INFO_BANNER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

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
      <div className={cn(HUB_INFO_BANNER, "flex-col items-stretch")}>
        <p className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
          {t("pages.routines.index.amy_adapts_title", {
            defaultValue: "Amy adapts to your family",
          })}
        </p>
        <FamilyTrustStrip surface={surface} compact />
        <p className="text-[11px] leading-snug text-muted-foreground">{surface.reassurance}</p>
      </div>
    );
  }

  return (
    <div className={HUB_INFO_BANNER}>
      <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
        {t("pages.routines.index.amy_will_use", { defaultValue: "Amy will use:" })}
      </p>
      <ul className="flex flex-wrap gap-2">
        {INPUT_KEYS.map((item) => (
          <li
            key={item.key}
            className="text-xs font-semibold px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.06] text-foreground"
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
    </div>
  );
}
