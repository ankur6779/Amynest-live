import { parseApiJson } from "@/lib/safe-json-response";
import {
  resolveNutritionCountryProfile,
  resolveEffectiveFoodStyle,
  type NutritionCountryProfile,
} from "@workspace/nutrition-localization";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import type { RegionCode } from "@/lib/nutrition-region";

type ParentNutritionApi = {
  foodStyle?: string | null;
  region?: string | null;
  country?: string | null;
};

export function useParentNutritionProfile() {
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery({
    queryKey: ["parent-profile-nutrition"],
    queryFn: async () => {
      const res = await authFetch("/api/parent-profile");
      if (!res.ok) return null;
      return parseApiJson(res) as Promise<ParentNutritionApi>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const countryProfile = resolveNutritionCountryProfile({
    country: data?.country,
    region: data?.region ?? data?.foodStyle,
    foodStyle: data?.foodStyle,
  });

  const foodStyle = resolveEffectiveFoodStyle(countryProfile, data?.foodStyle ?? data?.region ?? "mixed");
  const regionCode = countryProfile.regionCode as RegionCode;

  return { foodStyle, countryProfile, regionCode, country: data?.country ?? null, isLoading };
}

export type { NutritionCountryProfile };
