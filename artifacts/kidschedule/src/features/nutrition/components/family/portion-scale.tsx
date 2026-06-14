import { useTranslation } from "react-i18next";
import { AGE_SLOT_CONFIG } from "@/features/nutrition/lib/meal-slots";
import type { FamilyPortionResult } from "@/features/nutrition/types/nutrition-hub.types";
import { portionBarPercent } from "@/features/nutrition/lib/portion-scale";
import { PortionBar } from "@/features/nutrition/components/family/portion-bar";

export function PortionScale({ portions }: { portions: FamilyPortionResult["portions"] }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {AGE_SLOT_CONFIG.map((ag) => {
        const p = portions[ag.key];
        const percent = portionBarPercent(ag.key);
        return (
          <div key={ag.key} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none">{ag.icon}</span>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t(ag.labelKey)}
              </p>
            </div>
            <PortionBar percent={percent} />
            <p className="text-lg font-bold text-foreground leading-snug">{p.amount}</p>
            {p.texture && <p className="text-xs text-muted-foreground italic">{p.texture}</p>}
          </div>
        );
      })}
    </div>
  );
}
