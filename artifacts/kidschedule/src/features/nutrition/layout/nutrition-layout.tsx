import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PARENT_HUB_PAGE } from "@/lib/parent-hub-premium";
import { LockedBlock } from "@/components/locked-block";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useActiveChildId } from "@/hooks/use-active-child-id";
import { isHealthZoneJourneyEligible } from "@/lib/hub-visibility";
import { NutritionProvider, useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import {
  hydrateNutritionScore,
  configureNutritionSync,
} from "@/features/nutrition/lib/nutrition-sync";
import {
  configureMealMemorySync,
  hydrateMealMemory,
} from "@/features/nutrition/lib/nutrition-memory-sync";
import { NutritionTopNav } from "@/features/nutrition/layout/nutrition-top-nav";
import { NutritionSectionPanel } from "@/features/nutrition/layout/nutrition-section-panel";
import { NutritionHero } from "@/features/nutrition/components/shared/nutrition-hero";
import { NutrientDetailDialog } from "@/features/nutrition/components/learn/nutrient-detail-dialog";
import { NutritionDiscoveryHints } from "@/features/nutrition/components/shared/nutrition-discovery-hints";
import { NutritionDisclaimer } from "@/features/nutrition/components/shared/nutrition-disclaimer";
import { NutritionGrowthLink } from "@/features/nutrition/components/shared/nutrition-growth-link";
import {
  trackNutritionHubOpen,
  trackNutritionTabOpen,
} from "@/features/nutrition/lib/nutrition-hub-analytics";

function NutritionHubSessionAnalytics() {
  const { activeTab, childId } = useNutritionContext();

  useEffect(() => {
    trackNutritionHubOpen(childId);
  }, [childId]);

  useEffect(() => {
    trackNutritionTabOpen(activeTab, childId);
  }, [activeTab, childId]);

  return null;
}

function NutritionSyncBootstrap() {
  const { childId } = useNutritionContext();
  const authFetch = useAuthFetch();

  useEffect(() => {
    configureNutritionSync(authFetch);
    configureMealMemorySync(authFetch);
  }, [authFetch]);

  useEffect(() => {
    if (!childId) return;
    void hydrateNutritionScore(childId, authFetch);
    void hydrateMealMemory(childId, authFetch);
  }, [childId, authFetch]);

  return null;
}

function NutritionHubContent() {
  const { ageGroupId, regionConfig, getRegional, localizeNote, selectedNutrient, nutrientDialogOpen, setNutrientDialogOpen, setSelectedNutrient } =
    useNutritionContext();

  return (
    <>
      <NutritionHubSessionAnalytics />
      <NutritionSyncBootstrap />
      <NutritionHero />
      <NutritionTopNav />

      <div className="space-y-3 sm:space-y-4 pb-2">
        <NutritionDiscoveryHints />
        <NutritionSectionPanel />

        <NutritionGrowthLink />
        <NutritionDisclaimer />
      </div>

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
  const childId = useActiveChildId();
  const nutritionGate = useHubModuleGate("hub_nutrition", childId);
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
    <div className={cn(PARENT_HUB_PAGE, "w-full min-w-0 max-w-4xl mx-auto space-y-3 sm:space-y-4 pb-4 overflow-x-clip")}>
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
