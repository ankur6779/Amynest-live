// ─────────────────────────────────────────────────────────────────────────
// Top-level orchestrator. One async call returns a fully-populated
// EnvironmentalContext (or null if completely impossible to produce one).
//
// Used by the routine generation routes — see api-server/src/routes/routines.ts.
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

let defaultProvider: EnvironmentalProvider | null = null;
function getDefaultProvider(): EnvironmentalProvider {
  if (!defaultProvider) defaultProvider = new OpenMeteoProvider();
  return defaultProvider;
}

export interface OrchestratorInput {
  ageGroup: EnvAgeGroup;
  /** YYYY-MM-DD; used for season classification. */
  date?: string;
  /** Explicit lat/lng wins over country/region lookups. */
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
  region?: string | null;
  /** Optional injection for tests. */
  provider?: EnvironmentalProvider;
  /** Optional cancellation. */
  signal?: AbortSignal;
}

/**
 * Best-effort: resolves location → fetches snapshot → scores → explains.
 * NEVER throws. Returns `null` only if location resolution itself fails.
 */
export async function getEnvironmentalContext(
  input: OrchestratorInput,
): Promise<EnvironmentalContext | null> {
  try {
    const loc = resolveDefaultLocation({
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
    });
    const provider = input.provider ?? getDefaultProvider();
    const snapshot = await provider.fetchSnapshot({
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
      signal: input.signal,
    });
    const ctx = buildEnvironmentalContext({
      snapshot,
      ageGroup: input.ageGroup,
      location: { latitude: loc.latitude, longitude: loc.longitude, label: loc.label },
      date: input.date,
    });
    ctx.explanations = buildExplanations(ctx);
    return ctx;
  } catch {
    return null;
  }
}
