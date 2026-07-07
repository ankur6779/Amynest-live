import { getAnalyticsQuality } from "../../analyticsIngestService.js";
import { listDlqEntries } from "../../../queue/dlq-store.js";
import type { CtoOpsSnapshot, GrowthDashboardPayload } from "../types.js";

export async function computeCtoOps(input: {
  performance: GrowthDashboardPayload["performance"];
  devices: GrowthDashboardPayload["devices"];
}): Promise<CtoOpsSnapshot> {
  const analyticsIngest = getAnalyticsQuality();

  let queueMode = "memory";
  let redisConnected = false;
  let queueStatus = "unknown";

  try {
    const { getQueueHealthSnapshot } = await import("../../../queue/bootstrap.js");
    const snap = await getQueueHealthSnapshot();
    queueMode = snap.queueMode;
    redisConnected = snap.redis;
    queueStatus = snap.status;
  } catch {
    queueStatus = "unavailable";
  }

  let dlqCount = 0;
  try {
    const entries = await listDlqEntries(100);
    dlqCount = entries.length;
  } catch {
    dlqCount = 0;
  }

  const totalVersionUsers = input.devices.appVersions.reduce((s, v) => s + v.users, 0);
  const versionAdoption = input.devices.appVersions.map((v) => ({
    version: v.version,
    users: v.users,
    pct: totalVersionUsers > 0 ? Math.round((v.users / totalVersionUsers) * 1000) / 10 : 0,
  }));

  return {
    apiLatencyMs: input.performance.apiLatencyMs,
    crashCount: input.performance.crashCount,
    jsErrors: input.performance.jsErrors,
    networkErrors: input.performance.networkErrors,
    analyticsIngest: {
      accepted: analyticsIngest.accepted,
      invalidRate: analyticsIngest.invalidRate,
      rejectedUnknown: analyticsIngest.rejected.unknownEvent,
    },
    queue: {
      mode: queueMode,
      redisConnected,
      dlqCount,
      status: queueStatus,
    },
    database: { status: "connected" },
    versionAdoption,
    performance: input.performance,
  };
}
