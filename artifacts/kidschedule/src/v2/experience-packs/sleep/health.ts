import { SLEEP_PACK_VERSION } from "./contracts";
import { getSleepHealthCounters } from "./health-state";
import type { SleepExperienceHealth } from "./types";

export function getSleepExperienceHealth(): SleepExperienceHealth {
  const c = getSleepHealthCounters();
  return Object.freeze({
    packResolves: c.packResolves,
    surfaceBindings: c.surfaceBindings,
    unknownContentLookups: c.unknownContentLookups,
    packVersion: SLEEP_PACK_VERSION,
  });
}
