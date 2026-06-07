import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  fetchInfantActivation,
  infantActivationQueryKey,
  type InfantActivationStatus,
} from "@/lib/infant-activation-api";

export function useInfantActivation(childId: number | null | undefined) {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery<InfantActivationStatus>({
    queryKey: infantActivationQueryKey(childId ?? 0),
    queryFn: () => fetchInfantActivation(childId!),
    enabled: isLoaded && isSignedIn && childId != null && childId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
