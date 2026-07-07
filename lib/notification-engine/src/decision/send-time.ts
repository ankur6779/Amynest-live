export interface OpenEvent {
  /** Local hour 0–23 at which the user opened a notification. */
  hourLocal: number;
}

export interface PreferredSendTime {
  /** Learned preferred local hour, or null when confidence is too low. */
  hourLocal: number | null;
  /** Confidence 0–1 in the recommendation. */
  confidence: number;
  /** Number of open events the recommendation is based on. */
  sampleSize: number;
}

const MIN_SAMPLES_FOR_CONFIDENCE = 5;
const HIGH_CONFIDENCE_SAMPLES = 20;

/**
 * Learn a user's preferred notification hour from their historical open times.
 *
 * Returns a null hour with low confidence when there is not enough evidence, so
 * callers can safely fall back to the category's default slot. Never guesses
 * from a single open — a common cause of mistimed "smart" delivery.
 */
export function learnPreferredSendHour(opens: OpenEvent[]): PreferredSendTime {
  const valid = opens.filter((o) => o.hourLocal >= 0 && o.hourLocal <= 23);
  const sampleSize = valid.length;

  if (sampleSize < MIN_SAMPLES_FOR_CONFIDENCE) {
    return { hourLocal: null, confidence: sampleSize / MIN_SAMPLES_FOR_CONFIDENCE * 0.3, sampleSize };
  }

  // Build a smoothed histogram: each open contributes to its hour and, at half
  // weight, the adjacent hours (people are not precise to the minute).
  const buckets = new Array(24).fill(0);
  for (const o of valid) {
    buckets[o.hourLocal] += 1;
    buckets[(o.hourLocal + 23) % 24] += 0.5;
    buckets[(o.hourLocal + 1) % 24] += 0.5;
  }

  let bestHour = 0;
  let bestWeight = -1;
  for (let h = 0; h < 24; h++) {
    if (buckets[h] > bestWeight) {
      bestWeight = buckets[h];
      bestHour = h;
    }
  }

  // Confidence blends sample volume with peak concentration (how dominant the
  // best hour is versus the total mass).
  const totalWeight = buckets.reduce((a: number, b: number) => a + b, 0);
  const concentration = totalWeight > 0 ? bestWeight / totalWeight : 0;
  const volumeConfidence = Math.min(1, sampleSize / HIGH_CONFIDENCE_SAMPLES);
  const confidence = round2(clamp01(0.5 * volumeConfidence + 0.5 * (concentration * 3)));

  return { hourLocal: bestHour, confidence, sampleSize };
}

/**
 * Resolve the hour to actually schedule at, honoring the learned preference
 * only when confidence clears the bar; otherwise use the provided default.
 */
export function resolveSendHour(
  defaultHour: number,
  learned: PreferredSendTime | null,
  minConfidence = 0.5,
): { hourLocal: number; source: "learned" | "default" } {
  if (learned && learned.hourLocal != null && learned.confidence >= minConfidence) {
    return { hourLocal: learned.hourLocal, source: "learned" };
  }
  return { hourLocal: defaultHour, source: "default" };
}

/**
 * Weighted engagement event for the richer send-time model. Conversions and
 * clicks are stronger positive signals than a bare open; dismissals are
 * negative and pull the learned hour away.
 */
export interface WeightedEngagementEvent {
  hourLocal: number;
  opened?: boolean;
  clicked?: boolean;
  converted?: boolean;
  dismissed?: boolean;
}

const EVENT_WEIGHTS = { open: 1, click: 2.5, conversion: 5, dismissal: -1.5 } as const;
const MIN_NET_WEIGHT_FOR_CONFIDENCE = 6;
const HIGH_CONFIDENCE_WEIGHT = 30;

/**
 * Continuously-improving preferred-hour model that weights outcomes, not just
 * opens. Guards against overfitting tiny datasets by requiring a minimum net
 * positive signal mass before returning a non-null hour, and by smoothing the
 * histogram across adjacent hours.
 */
export function learnPreferredSendHourWeighted(
  events: WeightedEngagementEvent[],
): PreferredSendTime {
  const valid = events.filter((e) => e.hourLocal >= 0 && e.hourLocal <= 23);
  const buckets = new Array(24).fill(0);
  let netPositive = 0;
  let sampleSize = 0;

  for (const e of valid) {
    let w = 0;
    if (e.opened) w += EVENT_WEIGHTS.open;
    if (e.clicked) w += EVENT_WEIGHTS.click;
    if (e.converted) w += EVENT_WEIGHTS.conversion;
    if (e.dismissed) w += EVENT_WEIGHTS.dismissal;
    if (w === 0) continue;
    sampleSize++;
    if (w > 0) netPositive += w;
    buckets[e.hourLocal] += w;
    buckets[(e.hourLocal + 23) % 24] += w * 0.4;
    buckets[(e.hourLocal + 1) % 24] += w * 0.4;
  }

  if (netPositive < MIN_NET_WEIGHT_FOR_CONFIDENCE) {
    return {
      hourLocal: null,
      confidence: round2((netPositive / MIN_NET_WEIGHT_FOR_CONFIDENCE) * 0.3),
      sampleSize,
    };
  }

  let bestHour = 0;
  let bestWeight = -Infinity;
  let totalPositive = 0;
  for (let h = 0; h < 24; h++) {
    if (buckets[h] > 0) totalPositive += buckets[h];
    if (buckets[h] > bestWeight) {
      bestWeight = buckets[h];
      bestHour = h;
    }
  }

  const concentration = totalPositive > 0 ? Math.max(0, bestWeight) / totalPositive : 0;
  const volumeConfidence = Math.min(1, netPositive / HIGH_CONFIDENCE_WEIGHT);
  const confidence = round2(clamp01(0.5 * volumeConfidence + 0.5 * (concentration * 3)));

  return { hourLocal: bestHour, confidence, sampleSize };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
