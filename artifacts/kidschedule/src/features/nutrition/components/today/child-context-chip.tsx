import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { AGE_GROUPS } from "@/lib/nutrition-data";
import {
  NUTRITION_HUB_CHIP_ACTIVE,
  NUTRITION_HUB_CHIP_INACTIVE,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

function formatChildAge(months: number | null): string {
  if (months == null) return "";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}m` : `${years}y`;
}

export function ChildContextChip() {
  const { t } = useTranslation();
  const { activeChild, ageGroupId, ageGroupOverride, setAgeGroupOverride, activeAgeGroup } =
    useNutritionContext();
  const [expanded, setExpanded] = useState(false);

  const syncedId = monthsToAgeGroupId(activeChild.ageMonths);
  const isOverridden = ageGroupOverride != null && ageGroupOverride !== syncedId;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-left",
        )}
      >
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t("nutrition_hub.today.for_child")}</p>
          <p className="text-sm font-semibold text-foreground truncate">
            {activeChild.name ?? t("parent_hub.journey.your_child", { defaultValue: "your child" })}
            {activeChild.ageMonths != null && (
              <span className="text-muted-foreground font-normal"> · {formatChildAge(activeChild.ageMonths)}</span>
            )}
          </p>
          <p className="text-xs text-emerald-200/80 truncate">
            {activeAgeGroup.emoji} {activeAgeGroup.label}
            {isOverridden && ` · ${t("nutrition_hub.today.age_override")}`}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {AGE_GROUPS.filter((ag) =>
            ["infant_0_6", "infant_6_12", "toddler_1_3", "preschool_3_6", "school_6_10", "preteen_10_15"].includes(
              ag.id,
            ),
          ).map((ag) => (
            <button
              key={ag.id}
              type="button"
              onClick={() => {
                setAgeGroupOverride(ag.id === syncedId ? null : ag.id);
                setExpanded(false);
              }}
              className={cn(
                ageGroupId === ag.id ? NUTRITION_HUB_CHIP_ACTIVE : NUTRITION_HUB_CHIP_INACTIVE,
                "flex shrink-0 items-center gap-1.5",
              )}
            >
              <span>{ag.emoji}</span>
              <span className="hidden sm:inline">{ag.label}</span>
              <span className="sm:hidden">{ag.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
