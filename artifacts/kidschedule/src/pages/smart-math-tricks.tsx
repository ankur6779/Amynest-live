import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { SmartMathTricks } from "@/components/smart-math-tricks";
import {
  isGrowLivingV1Enabled,
  livingGrowPageTitle,
} from "@/lib/grow/living-room";

export default function SmartMathTricksPage() {
  const { t } = useTranslation();
  const living = isGrowLivingV1Enabled();

  return (
    <HubModulePageShell
      featureId="hub_smart_math_tricks"
      gateMode="action"
      title={
        living
          ? livingGrowPageTitle("numbers")
          : t("parent_hub.web_tiles.smart-math-tricks.title")
      }
      subtitle={(child) =>
        living ? `${child.name} · Quiet number play` : `${child.name} · Ages 2–8`
      }
      icon={<Sparkles className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths >= 24 && totalAgeMonths < 96}
      emptyMessage={
        living
          ? "Numbers gently is available from age 2+. Add or select an eligible child."
          : "Smart Math Tricks is available from age 2+. Add or select an eligible child."
      }
    >
      {({ child, gate }) => (
        <SmartMathTricks childName={child.name} ageYears={child.age} childId={child.id} gate={gate} />
      )}
    </HubModulePageShell>
  );
}
