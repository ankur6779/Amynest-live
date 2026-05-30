import { useQuery } from "@tanstack/react-query";
import { fetchBabyToday, type BabyTodayData } from "@/lib/infant-care-api";

export function useInfantToday(childId: number | null | undefined) {
  return useQuery<BabyTodayData>({
    queryKey: ["infant-today", childId],
    queryFn: () => fetchBabyToday(childId!),
    enabled: childId != null && childId > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
