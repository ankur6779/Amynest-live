import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIXED_ACTIVITY_TEMPLATES } from "@/lib/fixed-activities";

export function FixedActivitiesSuggestionBanner({
  onAddTemplate,
}: {
  onAddTemplate: (key: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2 flex-1">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm text-foreground">
          {t("pages.routines.fixed.suggestion", {
            defaultValue:
              "Add tuition or sports to improve routine accuracy — Amy will always schedule around them.",
          })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {FIXED_ACTIVITY_TEMPLATES.slice(0, 2).map((tpl) => (
          <Button
            key={tpl.key}
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-full text-xs"
            onClick={() => onAddTemplate(tpl.key)}
          >
            {tpl.emoji} {tpl.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
