// ─────────────────────────────────────────────────────────────────────────
// Top-level orchestrator. One async call returns a fully-populated
// EnvironmentalContext. NEVER throws and NEVER returns null — uses country
// fallback when fetch or scoring fails.
// ─────────────────────────────────────────────────────────────────────────

import type {
  EnvAgeGroup,
  EnvironmentalContext,
  EnvironmentalProvider,
} from "./types.js";
import { OpenMeteoProvider } from "./providers/openMeteo.js";
import { resolveDefaultLocation } from "./locationDefaults.js";
import { buildEnvironmentalContext } from "./risk.js";
import { buildExplanations } from "./explainability.js";
import {
  confidenceFromSource,
  fallbackAtmosphericSnapshot,
  finalizeSnapshot,
  logEnvDev,
} from "./snapshotPipeline.js";

let defaultProvider: EnvironmentalProvider | null = null;
function getDefaultProvider(): EnvironmentalProvider {
  if (!defaultProvider) defaultProvider = new OpenMeteoProvider();
  return defaultProvider;
}

export interface OrchestratorInput {
  ageGroup: EnvAgeGroup;
  /** YYYY-MM-DD; used for season classification. */
  date?: string;
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
  region?: string | null;
  provider?: EnvironmentalProvider;
  signal?: AbortSignal;
}

function buildFromSnapshot(
  snapshot: import("./types.js").AtmosphericSnapshot,
  input: OrchestratorInput,
  loc: { latitude: number; longitude: number; label: string },
  confidence: import("./types.js").EnvDataConfidence,
): EnvironmentalContext {
  const ctx = buildEnvironmentalContext({
    snapshot,
    ageGroup: input.ageGroup,
    location: { latitude: loc.latitude, longitude: loc.longitude, label: loc.label },
    date: input.date,
    confidence,
    country: input.country,
  });
  ctx.explanations = buildExplanations(ctx);
  return ctx;
}

/**
 * Best-effort: resolves location → fetches snapshot → scores → explains.
 * NEVER throws. Always returns a valid EnvironmentalContext with AQI set.
 */
export async function getEnvironmentalContext(
  input: OrchestratorInput,
): Promise<EnvironmentalContext> {
  const loc = resolveDefaultLocation({
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    country: input.country ?? null,
    region: input.region ?? null,
  });

  try {
    const provider = input.provider ?? getDefaultProvider();
    const raw = await provider.fetchSnapshot({
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
      country: input.country ?? null,
      signal: input.signal,
    });
    const { snapshot, confidence, aqiRepaired } = finalizeSnapshot(raw, input.country);
    logEnvDev("context_ready", {
      confidence,
      source: snapshot.source,
      aqi: snapshot.aqiUs,
      aqiRepaired,
    });
    return buildFromSnapshot(snapshot, input, loc, confidence);
  } catch (err) {
    logEnvDev("orchestrator_failure", {
      error: err instanceof Error ? err.message : String(err),
    });
    const snap = fallbackAtmosphericSnapshot(input.country);
    const confidence = confidenceFromSource("fallback");
    return buildFromSnapshot(snap, input, loc, confidence);
  }
}
