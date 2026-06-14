import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, BookOpen, ChevronDown } from "lucide-react";
import { MEDICAL_DISCLAIMER, REFERENCES } from "@/lib/nutrition-data";
import { HUB_INFO_BANNER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

export function NutritionDisclaimer() {
  const { t } = useTranslation();
  const [showRefs, setShowRefs] = useState(false);

  return (
    <div className={cn(HUB_INFO_BANNER, "flex-col items-stretch gap-0")}>
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-300/90 mt-0.5 shrink-0" />
        <p className="font-semibold text-foreground text-sm">{t("nutrition_hub.disclaimer.title")}</p>
      </div>
      <p className="text-sm text-muted-foreground">{MEDICAL_DISCLAIMER.en}</p>
      <button
        type="button"
        onClick={() => setShowRefs(!showRefs)}
        className="mt-3 flex items-center gap-1 text-xs text-emerald-200/80 hover:underline"
      >
        <BookOpen className="h-3 w-3" />
        {showRefs ? t("nutrition_hub.disclaimer.hide_refs") : t("nutrition_hub.disclaimer.show_refs")}
      </button>
      {showRefs && (
        <ol className="mt-2 space-y-1">
          {REFERENCES.map((ref, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              {i + 1}. {ref}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
