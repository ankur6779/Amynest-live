import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";

export function useParentNutritionProfile() {
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery({
    queryKey: ["parent-profile-nutrition"],
    queryFn: async () => {
      const res = await authFetch("/api/parent-profile");
      if (!res.ok) return null;
      return res.json() as Promise<{ foodStyle?: string | null; region?: string | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const foodStyle = data?.foodStyle ?? data?.region ?? "mixed";

  return { foodStyle, isLoading };
}
