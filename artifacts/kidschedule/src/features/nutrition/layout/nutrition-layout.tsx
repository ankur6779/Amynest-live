import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
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
import { NutritionLivingOpening } from "@/features/nutrition/components/shared/nutrition-living-opening";
import { NutrientDetailDialog } from "@/features/nutrition/components/learn/nutrient-detail-dialog";
import { NutritionDiscoveryHints } from "@/features/nutrition/components/shared/nutrition-discovery-hints";
import { NutritionDisclaimer } from "@/features/nutrition/components/shared/nutrition-disclaimer";
import { NutritionGrowthLink } from "@/features/nutrition/components/shared/nutrition-growth-link";
import { TodayScoreSummary } from "@/features/nutrition/components/today/today-score-summary";
import { WeeklyNutritionStory } from "@/features/nutrition/components/track/weekly-nutrition-story";
import { HouseholdNutritionBoard } from "@/features/nutrition/components/household/household-nutrition-board";
import {
  trackNutritionHubOpen,
  trackNutritionTabOpen,
} from "@/features/nutrition/lib/nutrition-hub-analytics";
import { isNutritionLivingV1Enabled } from "@/lib/nutrition/living-room";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { ParentHubQuietModuleProvider } from "@/lib/parent-hub/quiet-module-context";
import { buildParentingHubDeepLink } from "@/lib/hub-activity-cross-link";
import { AppLink } from "@/components/app-link";
import type { NutritionTab } from "@/features/nutrition/types/nutrition-hub.types";
import "@/pages/first-experience-material.css";
import "@/components/nutrition/nutrition-living-room.css";

const CARE_MEMORY = ROOM_HEROES.care;

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
  const { t } = useTranslation();
  const living = isNutritionLivingV1Enabled();
  const [moreOpen, setMoreOpen] = useState(false);
  const [deepened, setDeepened] = useState(false);
  const {
    ageGroupId,
    regionConfig,
    getRegional,
    localizeNote,
    selectedNutrient,
    nutrientDialogOpen,
    setNutrientDialogOpen,
    setSelectedNutrient,
    setActiveTab,
    activeTab,
  } = useNutritionContext();
  const careHref = buildParentingHubDeepLink("nutrition");

  const onDeepen = useCallback(
    (tab: NutritionTab) => {
      setActiveTab(tab);
      setDeepened(true);
      setMoreOpen(false);
    },
    [setActiveTab],
  );

  if (living) {
    return (
      <ParentHubQuietModuleProvider>
        <div
          className="fe-shell nutrition-living"
          data-testid="nutrition-living"
          data-ph-pack="nutrition-2"
          data-nu-hierarchy="deepen"
          data-fe-shot={CARE_MEMORY.shot}
          data-fe-room="reveal"
          data-fe-presence="settle"
        >
          <div className="fe-ambient" aria-hidden="true">
            <img
              src={CARE_MEMORY.src}
              alt=""
              decoding="async"
              loading="lazy"
              fetchPriority="low"
            />
            <div className="fe-ambient-wash" />
          </div>
          <div className="fe-breath fe-breath-a" aria-hidden="true" />
          <div className="fe-breath fe-breath-b" aria-hidden="true" />
          <div className="fe-living-shade" aria-hidden="true" />

          <div className="nu-living-content">
            <NutritionHubSessionAnalytics />
            <NutritionSyncBootstrap />

            <AppLink href={careHref} replace source="nutrition-back-care">
              <button type="button" className="nu-back" data-testid="nutrition-back-care">
                <ChevronLeft className="h-4 w-4" />
                {t("parent_hub.rooms.care.title", { defaultValue: "Care" })}
              </button>
            </AppLink>

            <NutritionLivingOpening
              onDeepen={onDeepen}
              activePath={deepened ? activeTab : null}
            />

            {deepened ? (
              <div
                className="nu-living-panel nu-deepen-panel"
                data-testid="nutrition-deepen"
                data-active-tab={activeTab}
              >
                <NutritionSectionPanel />
              </div>
            ) : null}

            <div>
              <button
                type="button"
                className="nu-more-toggle"
                data-testid="nutrition-more-toggle"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                {moreOpen
                  ? t("nutrition.living.more_hide", { defaultValue: "Hide more care" })
                  : t("nutrition.living.more_show", { defaultValue: "More care" })}
              </button>
              {moreOpen ? (
                <div className="nu-more-body" data-testid="nutrition-more-body">
                  <TodayScoreSummary />
                  <WeeklyNutritionStory compact />
                  <HouseholdNutritionBoard />
                  <NutritionDiscoveryHints />
                  <NutritionGrowthLink />
                  <NutritionDisclaimer />
                </div>
              ) : null}
            </div>

            <p className="nu-support-note">
              {t("nutrition.living.continuity", {
                defaultValue: "We'll continue helping as your child grows.",
              })}
            </p>
            <p className="nu-support-note nu-support-invite">{PREMIUM_VOICE.invitation}</p>
            <AppLink href="/dashboard" source="nutrition-exit-home">
              <span className="nu-exit-home" data-testid="nutrition-exit-home">
                {t("nutrition.living.exit_home", {
                  defaultValue: "Back to Today Home",
                })}
              </span>
            </AppLink>
            <p className="nu-support-note nu-support-continue">
              {t("nutrition.living.continue_support", {
                defaultValue: "Continue with AmyNest",
              })}
            </p>

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
          </div>
        </div>
      </ParentHubQuietModuleProvider>
    );
  }

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
  const living = isNutritionLivingV1Enabled();
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

  if (living) {
    return (
      <div className="w-full min-w-0 max-w-4xl mx-auto overflow-x-clip">
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
