import { useQuery } from "@tanstack/react-query";
import {
  fetchInfantActivation,
  infantActivationQueryKey,
  type InfantActivationStatus,
} from "@/lib/infant-activation-api";

export function useInfantActivation(childId: number | null | undefined) {
  return useQuery<InfantActivationStatus>({
    queryKey: infantActivationQueryKey(childId ?? 0),
    queryFn: () => fetchInfantActivation(childId!),
    enabled: childId != null && childId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
