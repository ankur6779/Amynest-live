import { infantFetch } from "@/lib/infant-care-api";

export type InfantActivationStepId = "feed" | "sleep" | "weight" | "cry";

export type InfantActivationStatus = {
  childId: number;
  childAgeDays: number;
  childAgeMonths: number;
  steps: Record<InfantActivationStepId, boolean>;
  completedCount: number;
  totalSteps: number;
  completionRate: number;
  showActivation: boolean;
  isFullyActivated: boolean;
  isEmptyState: boolean;
};

export const infantActivationQueryKey = (childId: number) =>
  ["infant-activation", childId] as const;

export async function fetchInfantActivation(childId: number): Promise<InfantActivationStatus> {
  const res = await infantFetch<{ ok: true; activation: InfantActivationStatus }>(
    `/api/infant-activation/${childId}`,
  );
  return res.activation;
}
