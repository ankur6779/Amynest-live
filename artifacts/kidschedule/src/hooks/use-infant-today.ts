import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { fetchBabyToday, type BabyTodayData } from "@/lib/infant-care-api";

export function useInfantToday(childId: number | null | undefined) {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery<BabyTodayData>({
    queryKey: ["infant-today", childId],
    queryFn: () => fetchBabyToday(childId!),
    enabled: isLoaded && isSignedIn && childId != null && childId > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
