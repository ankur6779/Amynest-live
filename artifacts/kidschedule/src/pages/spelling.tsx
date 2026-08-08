import { GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { SpellingMastery } from "@/components/spelling-mastery";
import {
  isGrowLivingV1Enabled,
  livingGrowPageTitle,
} from "@/lib/grow/living-room";

export default function SpellingPage() {
  const { t } = useTranslation();
  const living = isGrowLivingV1Enabled();

  return (
    <HubModulePageShell
      featureId="hub_spelling_mastery"
      title={
        living
          ? livingGrowPageTitle("spelling")
          : t("parent_hub.web_tiles.spelling-mastery.title")
      }
      subtitle={(child) => child.name}
      icon={<GraduationCap className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths >= 24}
      emptyMessage={
        living
          ? "Spelling calmly is available from age 2+. Add or select an eligible child."
          : "Spelling Mastery is available from age 2+. Add or select an eligible child."
      }
    >
      {({ child, totalAgeMonths }) => (
        <SpellingMastery
          childId={child.id}
          childName={child.name}
          ageMonths={totalAgeMonths}
        />
      )}
    </HubModulePageShell>
  );
}
