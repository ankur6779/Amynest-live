import type { CrashSeverity } from "./types.js";

/** Core parent flows — P0 when affected. */
const CORE_FLOW_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/dashboard/,
  /^\/children\/[^/]+$/,
  /^\/children\/new$/,
  /^\/routines/,
  /^\/onboarding/,
  /^\/hub/,
];

export function isCoreFlowRoute(route: string | null | undefined): boolean {
  if (!route) return false;
  return CORE_FLOW_ROUTE_PATTERNS.some((re) => re.test(route));
}

export function computeCrashSeverity(input: {
  count24h: number;
  recoverySuccessRate: number;
  coreFlowAffected: boolean;
  count7d: number;
}): CrashSeverity {
  if (
    input.count24h > 20 ||
    input.recoverySuccessRate < 70 ||
    (input.coreFlowAffected && input.count24h > 0)
  ) {
    return "P0";
  }
  if (input.count24h > 5) return "P1";
  if (input.count7d <= 1 && input.count24h <= 1) return "P3";
  return "P2";
}

export function computeRecoverySuccessRate(
  recovered: number,
  total: number,
): number {
  if (total <= 0) return 100;
  return Math.round((recovered / total) * 100);
}
