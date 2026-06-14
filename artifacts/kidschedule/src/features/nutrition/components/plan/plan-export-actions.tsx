import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import {
  buildDayWhatsAppText,
  downloadMealPlanPdf,
  generateMealPlanPdf,
  shareMealPlanText,
  type MealPlanDayExport,
  type MealPlanExportMeta,
} from "@/features/nutrition/lib/plan-meal-export";

export function PlanExportActions({
  ageCategory,
  isVeg,
  days,
}: {
  ageCategory: string;
  isVeg: boolean;
  days: MealPlanDayExport[];
}) {
  const { t } = useTranslation();
  const { selectedDay } = useNutritionContext();
  const [busy, setBusy] = useState<"whatsapp" | "pdf" | null>(null);

  const meta: MealPlanExportMeta = {
    ageCategory,
    dietLabel: isVeg ? t("nutrition_hub.veg") : t("nutrition_hub.non_veg"),
  };

  const day = days[selectedDay] ?? days[0];
  if (!day) return null;

  const onWhatsApp = async () => {
    setBusy("whatsapp");
    try {
      const text = buildDayWhatsAppText(day, meta);
      await shareMealPlanText(text, t("nutrition_hub.plan.export_share_title"));
    } finally {
      setBusy(null);
    }
  };

  const onPdf = async () => {
    setBusy("pdf");
    try {
      const bytes = await generateMealPlanPdf(days, meta);
      const slug = ageCategory.replace(/[^\w]+/g, "-").slice(0, 40).toLowerCase();
      downloadMealPlanPdf(bytes, `amynest-meal-plan-${slug}.pdf`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-1" data-testid="plan-export-actions">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={busy !== null}
        onClick={() => void onWhatsApp()}
        data-testid="plan-export-whatsapp"
      >
        <span aria-hidden>🟢</span>
        {t("nutrition_hub.plan.export_whatsapp")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={busy !== null}
        onClick={() => void onPdf()}
        data-testid="plan-export-pdf"
      >
        <span aria-hidden>📄</span>
        {t("nutrition_hub.plan.export_pdf")}
      </Button>
    </div>
  );
}
