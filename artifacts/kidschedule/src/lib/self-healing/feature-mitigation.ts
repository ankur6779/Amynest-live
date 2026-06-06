/**
 * Level 10 — Session-only feature mitigation (runtime flags, NOT source code changes).
 *
 * When a fingerprint spikes (5×/hour), disable the mapped experiment/feature for
 * this session and route users through a stable fallback path.
 */

const SPIKE_THRESHOLD = 5;
const SPIKE_WINDOW_MS = 60 * 60 * 1000;
const SPIKE_KEY = "amynest:self-healing:spikes";
const MITIGATED_KEY = "amynest:mitigated-features";

type SpikeEntry = { fingerprint: string; ts: number };

/** Readable fingerprint → runtime feature flag key (session disable only). */
const FINGERPRINT_TO_FEATURE: Record<string, string> = {
  "ChildForm|MaximumDepth|InfantEffect": "child-form-infant-normalize",
  "ChildForm|MaximumDepth|ChildForm": "child-form-infant-normalize",
  "ChildForm|TooManyRerenders|InfantEffect": "child-form-infant-normalize",
};

function readSpikes(): SpikeEntry[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SPIKE_KEY);
    return raw ? (JSON.parse(raw) as SpikeEntry[]) : [];
  } catch {
    return [];
  }
}

function writeSpikes(entries: SpikeEntry[]): void {
  if (typeof sessionStorage === "undefined") return;
  const cutoff = Date.now() - SPIKE_WINDOW_MS;
  const pruned = entries.filter((e) => e.ts >= cutoff).slice(-200);
  try {
    sessionStorage.setItem(SPIKE_KEY, JSON.stringify(pruned));
  } catch {
    /* ignore */
  }
}

function readMitigated(): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(MITIGATED_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

function writeMitigated(features: Set<string>): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(MITIGATED_KEY, JSON.stringify([...features]));
  } catch {
    /* ignore */
  }
}

export function isFeatureMitigated(featureKey: string): boolean {
  return readMitigated().has(featureKey);
}

export function getMitigatedFeatures(): string[] {
  return [...readMitigated()];
}

/**
 * Record a crash fingerprint; auto-disable mapped feature if spike threshold hit.
 * Returns the feature key mitigated, if any.
 */
export function recordFingerprintSpike(readableFingerprint: string): string | null {
  const now = Date.now();
  const spikes = readSpikes();
  spikes.push({ fingerprint: readableFingerprint, ts: now });
  writeSpikes(spikes);

  const cutoff = now - SPIKE_WINDOW_MS;
  const count = spikes.filter(
    (e) => e.fingerprint === readableFingerprint && e.ts >= cutoff,
  ).length;

  if (count < SPIKE_THRESHOLD) return null;

  const featureKey = FINGERPRINT_TO_FEATURE[readableFingerprint];
  if (!featureKey) return null;

  const mitigated = readMitigated();
  if (mitigated.has(featureKey)) return featureKey;

  mitigated.add(featureKey);
  writeMitigated(mitigated);
  console.warn("[amynest:self-healing] Feature mitigated for session:", featureKey, {
    fingerprint: readableFingerprint,
    count,
  });
  return featureKey;
}

/** @internal Vitest */
export function resetFeatureMitigationForTests(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SPIKE_KEY);
  sessionStorage.removeItem(MITIGATED_KEY);
}
