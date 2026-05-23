import { isSetupComplete, useOnboardingStatus } from "@/hooks/useOnboardingStatus";

export function useProfileComplete() {
  const { data, isLoading, isFetching, isError } = useOnboardingStatus();

  return {
    profileComplete: isSetupComplete(data),
    isLoading: isLoading && data === undefined,
    isFetching,
    isError,
  };
}
