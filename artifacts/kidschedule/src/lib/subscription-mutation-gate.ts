import {
  handleSubscriptionGateError,
  type GateErrorBody,
} from "@/lib/subscription-gate";

/** React Query / fetch mutation error shape from api-client. */
export function handleSubscriptionMutationGateError(
  error: unknown,
  source: string,
): boolean {
  const err = error as { status?: number; data?: GateErrorBody; response?: { status?: number } };
  const status = err.status ?? err.response?.status ?? 0;
  const body = err.data;
  return handleSubscriptionGateError(status, body, source);
}
