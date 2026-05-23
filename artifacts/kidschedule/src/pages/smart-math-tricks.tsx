import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { SmartMathTricks } from "@/components/smart-math-tricks";

export default function SmartMathTricksPage() {
  const { t } = useTranslation();

  return (
    <HubModulePageShell
      featureId="hub_smart_math_tricks"
      title={t("parent_hub.web_tiles.smart-math-tricks.title")}
      subtitle={(child) => `${child.name} · Ages 4–8`}
      icon={<Sparkles className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths >= 48 && totalAgeMonths < 96}
      emptyMessage="Smart Math Tricks is designed for ages 4–8. Add or select a child in that range."
    >
      {({ child }) => (
        <SmartMathTricks childName={child.name} ageYears={child.age} />
      )}
    </HubModulePageShell>
  );
}
