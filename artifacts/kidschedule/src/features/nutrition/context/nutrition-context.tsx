import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AGE_GROUPS, type AgeGroup, type AgeGroupId, type Nutrient } from "@/lib/nutrition-data";
import {
  useNutritionRegion,
  REGION_CONFIGS,
  getRegionalSources,
  type RegionConfig,
  type RegionalFoodSource,
  type RegionCode,
} from "@/lib/nutrition-region";
import type { NutritionCountryProfile } from "@workspace/nutrition-localization";
import { getMondayBasedDayIndex, monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import { useParentNutritionProfile } from "@/features/nutrition/hooks/use-parent-nutrition-profile";
import type { NutritionTab, PlanSource } from "@/features/nutrition/types/nutrition-hub.types";

export type NutritionContextValue = {
  childId: number | null;
  activeTab: NutritionTab;
  setActiveTab: (tab: NutritionTab) => void;
  activeChild: { ageMonths: number | null; name: string | null };
  ageGroupId: AgeGroupId;
  ageGroupOverride: AgeGroupId | null;
  setAgeGroupOverride: (id: AgeGroupId | null) => void;
  activeAgeGroup: AgeGroup;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  planSource: PlanSource;
  setPlanSource: (source: PlanSource) => void;
  /** Classic meal plan diet toggle — drives grocery list integrity (C4). */
  classicPlanIsVeg: boolean;
  setClassicPlanIsVeg: (isVeg: boolean) => void;
  suggestedMeal: string;
  setSuggestedMeal: (meal: string) => void;
  foodStyle: string;
  countryProfile: NutritionCountryProfile;
  regionCode: RegionCode;
  regionConfig: RegionConfig;
  getRegional: (nutrientId: string) => RegionalFoodSource[] | null;
  localizeNote: (note?: string) => string | undefined;
  selectedNutrient: Nutrient | null;
  setSelectedNutrient: (nutrient: Nutrient | null) => void;
  nutrientDialogOpen: boolean;
  setNutrientDialogOpen: (open: boolean) => void;
  openNutrientDetail: (nutrient: Nutrient) => void;
};

const NutritionContext = createContext<NutritionContextValue | null>(null);

export function NutritionProvider({
  childId,
  childAgeMonths,
  childName,
  children,
}: {
  childId: number | null;
  childAgeMonths: number | null;
  childName: string | null;
  children: ReactNode;
}) {
  const { foodStyle, countryProfile, regionCode } = useParentNutritionProfile();
  const timezoneRegion = useNutritionRegion();
  const regionConfig = REGION_CONFIGS[regionCode] ?? timezoneRegion.config;
  const getRegional = useCallback(
    (nutrientId: string) => getRegionalSources(nutrientId, regionCode),
    [regionCode],
  );
  const localizeNote = useCallback(
    (note?: string) => {
      if (!note || regionCode === "IN") return note;
      return note.replace(/ICMR-NIN\s*20\d\d/g, regionConfig.authorityShort);
    },
    [regionCode, regionConfig.authorityShort],
  );

  const [activeTab, setActiveTab] = useState<NutritionTab>("today");
  const [ageGroupOverride, setAgeGroupOverride] = useState<AgeGroupId | null>(null);
  const [selectedDay, setSelectedDay] = useState(getMondayBasedDayIndex);
  const [planSource, setPlanSource] = useState<PlanSource>("classic");
  const [classicPlanIsVeg, setClassicPlanIsVeg] = useState(true);
  const [suggestedMeal, setSuggestedMeal] = useState("");
  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [nutrientDialogOpen, setNutrientDialogOpen] = useState(false);

  const syncedAgeGroupId = useMemo(
    () => monthsToAgeGroupId(childAgeMonths),
    [childAgeMonths],
  );

  const ageGroupId = ageGroupOverride ?? syncedAgeGroupId;
  const activeAgeGroup = useMemo(
    () => AGE_GROUPS.find((a) => a.id === ageGroupId) ?? AGE_GROUPS[2],
    [ageGroupId],
  );

  const openNutrientDetail = useCallback((nutrient: Nutrient) => {
    setSelectedNutrient(nutrient);
    setNutrientDialogOpen(true);
  }, []);

  const value = useMemo<NutritionContextValue>(
    () => ({
      childId,
      activeTab,
      setActiveTab,
      activeChild: { ageMonths: childAgeMonths, name: childName },
      ageGroupId,
      ageGroupOverride,
      setAgeGroupOverride,
      activeAgeGroup,
      selectedDay,
      setSelectedDay,
      planSource,
      setPlanSource,
      classicPlanIsVeg,
      setClassicPlanIsVeg,
      suggestedMeal,
      setSuggestedMeal,
      foodStyle,
      countryProfile,
      regionCode,
      regionConfig,
      getRegional,
      localizeNote,
      selectedNutrient,
      setSelectedNutrient,
      nutrientDialogOpen,
      setNutrientDialogOpen,
      openNutrientDetail,
    }),
    [
      childId,
      activeTab,
      childAgeMonths,
      childName,
      ageGroupId,
      ageGroupOverride,
      activeAgeGroup,
      selectedDay,
      planSource,
      classicPlanIsVeg,
      suggestedMeal,
      foodStyle,
      countryProfile,
      regionCode,
      regionConfig,
      getRegional,
      localizeNote,
      selectedNutrient,
      nutrientDialogOpen,
      openNutrientDetail,
    ],
  );

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>;
}

export function useNutritionContext(): NutritionContextValue {
  const ctx = useContext(NutritionContext);
  if (!ctx) {
    throw new Error("useNutritionContext must be used within NutritionProvider");
  }
  return ctx;
}
