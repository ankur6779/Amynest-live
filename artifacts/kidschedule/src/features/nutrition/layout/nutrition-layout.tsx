import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PARENT_HUB_PAGE } from "@/lib/parent-hub-premium";
import { LockedBlock } from "@/components/locked-block";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { isHealthZoneJourneyEligible } from "@/lib/hub-visibility";
import { readStoredActiveChildId } from "@/lib/coach-age-nav";
import { NutritionProvider, useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { hydrateNutritionScore, configureNutritionSync } from "@/features/nutrition/lib/nutrition-sync";
import { hydrateMealMemory } from "@/features/nutrition/lib/nutrition-memory-sync";
import { NutritionBottomNav, NutritionTopNav } from "@/features/nutrition/layout/nutrition-bottom-nav";
import { NutrientDetailDialog } from "@/features/nutrition/components/learn/nutrient-detail-dialog";
import { NutritionDiscoveryHints } from "@/features/nutrition/components/shared/nutrition-discovery-hints";
import { NutritionDisclaimer } from "@/features/nutrition/components/shared/nutrition-disclaimer";
import { NutritionGrowthLink } from "@/features/nutrition/components/shared/nutrition-growth-link";
import { TodayPage } from "@/features/nutrition/pages/today-page";
import { PlanPage } from "@/features/nutrition/pages/plan-page";
import { TrackPage } from "@/features/nutrition/pages/track-page";
import { LearnPage } from "@/features/nutrition/pages/learn-page";
import { FamilyPage } from "@/features/nutrition/pages/family-page";

function NutritionSyncBootstrap() {
  const { childId } = useNutritionContext();
  const authFetch = useAuthFetch();

  useEffect(() => {
    configureNutritionSync(authFetch);
  }, [authFetch]);

  useEffect(() => {
    if (!childId) return;
    void hydrateNutritionScore(childId, authFetch);
    void hydrateMealMemory(childId, authFetch);
  }, [childId, authFetch]);

  return null;
}

function NutritionHubContent() {
  const { activeTab, ageGroupId, regionConfig, getRegional, localizeNote, selectedNutrient, nutrientDialogOpen, setNutrientDialogOpen, setSelectedNutrient } =
    useNutritionContext();

  return (
    <>
      <NutritionSyncBootstrap />
      <NutritionTopNav />

      <div className="space-y-3 sm:space-y-4 pb-2">
        <NutritionDiscoveryHints />
        {activeTab === "today" && <TodayPage />}
        {activeTab === "plan" && <PlanPage />}
        {activeTab === "track" && <TrackPage />}
        {activeTab === "learn" && <LearnPage />}
        {activeTab === "family" && <FamilyPage />}

        <NutritionGrowthLink />
        <NutritionDisclaimer />
      </div>

      <NutritionBottomNav />

      <NutrientDetailDialog
        nutrient={selectedNutrient}
        ageGroupId={ageGroupId}
        open={nutrientDialogOpen}
        onClose={() => {
          setNutrientDialogOpen(false);
          setSelectedNutrient(null);
        }}
        regionConfig={regionConfig}
        regionalSources={selectedNutrient ? getRegional(selectedNutrient.id) : null}
        localizeNote={localizeNote}
      />
    </>
  );
}

export default function NutritionLayout() {
  const { t } = useTranslation();
  const nutritionGate = useHubModuleGate("hub_nutrition");
  const childId = readStoredActiveChildId();
  const journeyChildName =
    nutritionGate.childName ?? t("parent_hub.journey.your_child", { defaultValue: "your child" });
  const showHealthZoneJourneyGate =
    nutritionGate.childAgeMonths != null && isHealthZoneJourneyEligible(nutritionGate.childAgeMonths);

  const pageBody = (
    <NutritionProvider
      childId={childId}
      childAgeMonths={nutritionGate.childAgeMonths}
      childName={nutritionGate.childName ?? null}
    >
      <NutritionHubContent />
    </NutritionProvider>
  );

  return (
    <div className={cn(PARENT_HUB_PAGE, "w-full min-w-0 max-w-4xl mx-auto space-y-3 sm:space-y-4 pb-24 overflow-x-clip")}>
      {showHealthZoneJourneyGate && nutritionGate.journeySoft ? (
        <JourneyPreviewContent childName={journeyChildName}>{pageBody}</JourneyPreviewContent>
      ) : showHealthZoneJourneyGate ? (
        <LockedBlock locked={nutritionGate.locked} reason="hub_journey" journeySoft={nutritionGate.journeySoft}>
          {pageBody}
        </LockedBlock>
      ) : (
        pageBody
      )}
    </div>
  );
}
