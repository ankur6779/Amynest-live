import { getResolverHealthCounters } from "./health-state";
import {
  AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
  type TodayResolverHealth,
} from "./types";

export function getResolverHealth(): TodayResolverHealth {
  const c = getResolverHealthCounters();
  return Object.freeze({
    resolvedCards: c.resolvedCards,
    missingCards: c.missingCards,
    legacyFallbacks: c.legacyFallbacks,
    resolverVersion: AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
  });
}
