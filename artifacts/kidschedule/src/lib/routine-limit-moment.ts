import { notifyPremiumMoment } from "@/lib/premium-moment-notify";

/** Dispatches value-first upgrade sheet instead of blocking paywall for routine limits. */
export function notifyRoutineLimitMoment(
  source?: string,
  routineCount?: number,
): void {
  notifyPremiumMoment("routine_limit", { source, routineCount });
}
