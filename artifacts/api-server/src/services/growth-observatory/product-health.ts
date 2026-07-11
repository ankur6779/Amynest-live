import { getStartupFunnelDashboardStats } from "../startup-funnel-service.js";
import type { ObservatoryTrend } from "./types.js";
import type { TrendValue } from "../growth-dashboard/types.js";

function toObservatoryTrend(
  tv: TrendValue | undefined,
  verified = true,
  note: string | null = null,
): ObservatoryTrend {
  return {
    value: tv?.value ?? null,
    previous: tv?.previous ?? null,
    changePct: tv?.changePct ?? null,
    trend1d: null,
    trend7d: tv?.changePct ?? null,
    trend30d: null,
    verified,
    note,
  };
}

export async function computeProductHealthMetrics(input: {
  kpis: Record<string, TrendValue>;
  performance: {
    crashFreePct: number | null;
    crashCount: number;
    apiLatencyMs: number | null;
    networkErrors: number;
  };
  periodDays: number;
}) {
  let startupStats: Awaited<ReturnType<typeof getStartupFunnelDashboardStats>> | null = null;
  try {
    startupStats = await getStartupFunnelDashboardStats(Math.min(input.periodDays, 30));
  } catch {
    startupStats = null;
  }

  const startupVerified = (startupStats?.sampleCount ?? 0) >= 20;

  return {
    crashFreePct: toObservatoryTrend(input.kpis.crashFreePct, true),
    startupSuccessPct: {
      value: startupStats?.startupSuccessRate ?? null,
      previous: null,
      changePct: null,
      trend1d: null,
      trend7d: null,
      trend30d: null,
      verified: startupVerified,
      note: startupVerified ? null : "NOT VERIFIED — insufficient startup_funnel_events",
    } satisfies ObservatoryTrend,
    startupFailurePct: {
      value: startupStats?.startupFailureRate ?? null,
      previous: null,
      changePct: null,
      trend1d: null,
      trend7d: null,
      trend30d: null,
      verified: startupVerified,
      note: startupVerified ? null : "NOT VERIFIED",
    } satisfies ObservatoryTrend,
    blankScreenPct: {
      value: startupStats?.blankScreenRate ?? null,
      previous: null,
      changePct: null,
      trend1d: null,
      trend7d: null,
      trend30d: null,
      verified: startupVerified,
      note: null,
    } satisfies ObservatoryTrend,
    authFailurePct: {
      value: startupStats?.authFailureRate ?? null,
      previous: null,
      changePct: null,
      trend1d: null,
      trend7d: null,
      trend30d: null,
      verified: startupVerified,
      note: null,
    } satisfies ObservatoryTrend,
    apiFailureCount: {
      value: input.performance.networkErrors,
      previous: null,
      changePct: null,
      trend1d: null,
      trend7d: null,
      trend30d: null,
      verified: true,
      note: null,
    } satisfies ObservatoryTrend,
    routineFailureNote: {
      value: null,
      previous: null,
      changePct: null,
      trend1d: null,
      trend7d: null,
      trend30d: null,
      verified: false,
      note: "Routine failure rate — query routine_generation_failed / started ratio in SQL",
    } satisfies ObservatoryTrend,
    avgApiLatencyMs: {
      value: input.performance.apiLatencyMs,
      previous: null,
      changePct: null,
      trend1d: null,
      trend7d: null,
      trend30d: null,
      verified: input.performance.apiLatencyMs != null,
      note: input.performance.apiLatencyMs == null ? "NOT VERIFIED" : null,
    } satisfies ObservatoryTrend,
    startupFailureRate: startupStats?.startupFailureRate ?? null,
  };
}

export function buildDataGaps(input: {
  campaignsAvailable: boolean;
  startupSample: number;
  firstValueEvents: number;
  purchaseTotal: number;
}): string[] {
  const gaps: string[] = [];
  if (!input.campaignsAvailable) {
    gaps.push("Cost per install / paid vs organic — NOT VERIFIED (no ad spend integration)");
  }
  if (input.startupSample < 20) {
    gaps.push("Startup reliability metrics — NOT VERIFIED (startup_funnel_events sample < 20)");
  }
  if (input.firstValueEvents === 0) {
    gaps.push("First-value activation funnel — NOT VERIFIED (awaiting first_value_* event traffic)");
  }
  if (input.purchaseTotal === 0) {
    gaps.push("Purchase success/failure rates — NOT VERIFIED (zero purchase events in window)");
  }
  gaps.push("Meta Ads / Google Ads cohorts — NOT VERIFIED (no UTM attribution in production)");
  return gaps;
}
