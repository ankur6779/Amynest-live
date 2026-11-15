/**
 * Staging must not boot against the production database, Redis, or API host.
 * Production boots do not call this. Markers are public hostnames already
 * recorded in docs/sale-readiness/EVIDENCE/04-DATABASE/PRODUCTION_DB_IDENTITY.md.
 */

export const STAGING_API_HOST = "api-staging.amynest.in";
export const STAGING_WEB_HOST = "staging.amynest.in";
export const STAGING_DATABASE_NAME = "amynest_staging";

const PRODUCTION_DATABASE_HOST_MARKERS = [
  "tcl9udyxcuq2zu598ebj0pfu",
  "188.245.208.126",
  "dpg-d85k80jtqb8s7382m7lg-a",
] as const;

const PRODUCTION_REDIS_HOST_MARKERS = ["g7jotufnm43n4au4e8n6x946"] as const;

const PRODUCTION_API_HOST_MARKERS = [
  "188.245.208.126",
  "ik6ml2uhw6op765lo14wn5m3",
  "www.amynest.in",
  "amynest-backend-dykj.onrender.com",
] as const;

export type StagingIsolationInput = {
  databaseUrl?: string;
  redisUrl?: string;
  apiPublicUrl?: string;
  workerEnabled?: boolean;
};

function hostnameOf(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function databaseNameOf(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const name = new URL(value).pathname.replace(/^\//, "").split("/")[0] ?? "";
    return name.toLowerCase();
  } catch {
    return null;
  }
}

function mentions(host: string | null, markers: readonly string[]): string | null {
  if (!host) return null;
  return markers.find((marker) => host === marker || host.includes(marker)) ?? null;
}

/** Returns a non-secret reason, or null when the staging target is isolated. */
export function stagingIsolationProblem(input: StagingIsolationInput): string | null {
  const databaseHost = hostnameOf(input.databaseUrl);
  const databaseName = databaseNameOf(input.databaseUrl);
  if (!input.databaseUrl?.trim()) return "DATABASE_URL missing";
  if (!databaseHost || !databaseName) return "DATABASE_URL is not a valid postgres URL";

  const productionDatabase = mentions(databaseHost, PRODUCTION_DATABASE_HOST_MARKERS);
  if (productionDatabase) {
    return `DATABASE_URL host matches production marker ${productionDatabase}`;
  }
  if (databaseName === "amynest_dev") {
    return "DATABASE_URL uses local development database amynest_dev";
  }
  if (databaseName !== STAGING_DATABASE_NAME) {
    return `DATABASE_URL database must be ${STAGING_DATABASE_NAME}`;
  }

  const apiHost = hostnameOf(input.apiPublicUrl);
  if (apiHost !== STAGING_API_HOST) {
    return `API_PUBLIC_URL host must be ${STAGING_API_HOST}`;
  }
  const productionApi = mentions(apiHost, PRODUCTION_API_HOST_MARKERS);
  if (productionApi) return `API_PUBLIC_URL matches production marker ${productionApi}`;

  const redisHost = hostnameOf(input.redisUrl);
  const productionRedis = mentions(redisHost, PRODUCTION_REDIS_HOST_MARKERS);
  if (productionRedis) return `REDIS_URL host matches production marker ${productionRedis}`;
  if (input.workerEnabled && !redisHost) {
    return "WORKER_ENABLED requires a staging REDIS_URL";
  }
  return null;
}

export function assertStagingIsolationFromEnv(): void {
  const problem = stagingIsolationProblem({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    apiPublicUrl: process.env.API_PUBLIC_URL,
    workerEnabled: process.env.WORKER_ENABLED === "true",
  });
  if (problem) {
    console.error(`STAGING ISOLATION: ${problem}`);
    process.exit(1);
  }
}
