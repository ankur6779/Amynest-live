export interface StressConfig {
  apiUrl: string;
  users: number;
  batchSize: number;
  pollStatus: boolean;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  initialSlaMs: number;
  authToken: string;
  verbose: boolean;
}

const PROFILES = {
  low: { users: 10, batchSize: 5 },
  medium: { users: 50, batchSize: 10 },
  high: { users: 100, batchSize: 10 },
} as const;

export type StressProfile = keyof typeof PROFILES;

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    if (arg === `--${name}`) return "true";
  }
  return undefined;
}

function parseIntArg(
  name: string,
  fallback: number,
  envKeys: string[] = [],
): number {
  const raw =
    parseArg(name) ??
    envKeys.map((k) => process.env[k]).find((v) => v !== undefined);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function loadStressConfig(): StressConfig {
  const profile = (parseArg("profile") ?? process.env.COACH_STRESS_PROFILE) as StressProfile | undefined;
  const profileDefaults = profile && profile in PROFILES ? PROFILES[profile] : { users: 10, batchSize: 10 };

  const apiUrl = (
    parseArg("api-url") ??
    process.env.API_URL ??
    process.env.COACH_STRESS_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

  const authToken =
    parseArg("token") ??
    process.env.COACH_STRESS_AUTH_TOKEN ??
    process.env.STRESS_AUTH_TOKEN ??
    "";

  if (!authToken) {
    throw new Error(
      "Missing auth token. Set COACH_STRESS_AUTH_TOKEN (Firebase ID Bearer token) or pass --token=…",
    );
  }

  return {
    apiUrl,
    users: parseIntArg("users", profileDefaults.users, ["USERS", "COACH_STRESS_USERS"]),
    batchSize: parseIntArg("batch", profileDefaults.batchSize, ["BATCH_SIZE", "COACH_STRESS_BATCH_SIZE"]),
    pollStatus: parseArg("no-poll") !== "true",
    pollIntervalMs: parseIntArg("poll-interval", 2000, ["COACH_STRESS_POLL_INTERVAL_MS"]),
    pollTimeoutMs: parseIntArg("poll-timeout", 180_000, ["COACH_STRESS_POLL_TIMEOUT_MS"]),
    initialSlaMs: parseIntArg("initial-sla", 5000, ["COACH_STRESS_INITIAL_SLA_MS"]),
    authToken,
    verbose: parseArg("verbose") === "true" || process.env.COACH_STRESS_VERBOSE === "1",
  };
}

/** Goals rotated per virtual user to reduce cache hits during stress runs. */
export const STRESS_COACH_GOALS = [
  "manage-tantrums",
  "balance-screen-time",
  "improve-sleep-patterns",
  "reduce-defiance",
  "boost-concentration",
  "emotional-regulation",
  "encourage-independent-eating",
  "build-study-discipline",
  "separation-anxiety",
  "fix-bedtime-resistance",
] as const;

export const STRESS_AGE_GROUPS = ["2-4", "5-7", "8-10", "10+"] as const;
export const STRESS_SEVERITIES = ["mild", "moderate", "severe"] as const;
