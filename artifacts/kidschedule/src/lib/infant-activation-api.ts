import { getApiUrl } from "@/lib/api";

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

async function infantFetch<T>(path: string): Promise<T> {
  const res = await fetch(getApiUrl(path), { credentials: "include" });
  if (!res.ok) throw new Error(`infant_activation_${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchInfantActivation(childId: number): Promise<InfantActivationStatus> {
  const res = await infantFetch<{ ok: true; activation: InfantActivationStatus }>(
    `/api/infant-activation/${childId}`,
  );
  return res.activation;
}
