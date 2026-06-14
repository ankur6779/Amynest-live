import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  HUB_BODY,
  HUB_SECTION_TITLE,
  NUTRITION_HUB_ACCENT,
  hubAccentBarClasses,
  hubSectionCardClasses,
} from "@/lib/parent-hub-premium";
import { CaregiverSharePanel } from "@/features/nutrition/components/household/caregiver-share-panel";
import { FamilyModeSection } from "@/features/nutrition/components/family/family-mode-section";

export function FamilyPage() {
  const { t } = useTranslation();

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "hub-page-enter overflow-hidden")}>
      <div className="flex">
        <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
        <div className="min-w-0 flex-1 p-4 sm:p-6 space-y-4">
          <div>
            <h2 className={HUB_SECTION_TITLE}>{t("nutrition_hub.family.page_title")}</h2>
            <p className={HUB_BODY}>{t("nutrition_hub.family.page_subtitle")}</p>
          </div>
          <CaregiverSharePanel />
          <FamilyModeSection />
        </div>
      </div>
    </div>
  );
}
