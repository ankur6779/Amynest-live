/**
 * Correlate Video DNA dimensions with real performance.
 */

import { createHash } from "node:crypto";
import type {
  CorrelationInsight,
  PlatformPerformance,
  VideoDna,
} from "../types.js";

export function correlateDnaWithPerformance(
  dnaList: VideoDna[],
  performances: PlatformPerformance[],
): CorrelationInsight[] {
  const byVideo = new Map(performances.map((p) => [p.videoId, p]));
  const paired = dnaList
    .map((dna) => {
      const perf = byVideo.get(dna.videoId);
      return perf ? { dna, perf } : null;
    })
    .filter((p): p is { dna: VideoDna; perf: PlatformPerformance } => Boolean(p));

  if (paired.length < 2) return [];

  const insights: CorrelationInsight[] = [];
  insights.push(
    ...compareDimension(paired, "hookStyle", (d) => d.hookStyle),
    ...compareDimension(paired, "emotion", (d) => d.emotion),
    ...compareDimension(paired, "ctaVariant", (d) => d.ctaVariant),
    ...compareDimension(paired, "characters", (d) =>
      [...d.characters].sort().join("+"),
    ),
    ...compareDimension(paired, "duration", (d) => String(d.durationSeconds)),
    ...compareDimension(paired, "publishHour", (d) => String(d.publishHour)),
    ...compareDimension(paired, "musicStyle", (d) => d.musicStyle),
    ...compareDimension(paired, "cameraStyle", (d) => d.cameraStyle),
    ...compareDimension(paired, "series", (d) => String(d.seriesId)),
    ...compareDimension(paired, "season", (d) => d.season),
    ...compareDimension(paired, "platform", (d) => d.platform),
  );

  return insights.sort((a, b) => b.lift - a.lift);
}

function compareDimension(
  paired: Array<{ dna: VideoDna; perf: PlatformPerformance }>,
  dimension: CorrelationInsight["dimension"],
  keyFn: (dna: VideoDna) => string,
): CorrelationInsight[] {
  const buckets = new Map<string, number[]>();
  for (const row of paired) {
    const key = keyFn(row.dna);
    const list = buckets.get(key) ?? [];
    list.push(row.perf.performanceScore);
    buckets.set(key, list);
  }
  if (buckets.size < 2) return [];

  const ranked = [...buckets.entries()]
    .map(([key, scores]) => ({
      key,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      n: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const winner = ranked[0]!;
  const loser = ranked[ranked.length - 1]!;
  if (winner.key === loser.key) return [];
  const lift = winner.avg - loser.avg;
  if (lift < 3) return [];

  const sampleSize = winner.n + loser.n;
  const confidence = Math.min(0.95, 0.4 + sampleSize * 0.05 + lift / 100);

  return [
    {
      id: `corr_${createHash("sha256")
        .update(`${dimension}|${winner.key}|${loser.key}`)
        .digest("hex")
        .slice(0, 10)}`,
      dimension,
      winner: winner.key,
      loser: loser.key,
      winnerScore: Math.round(winner.avg),
      loserScore: Math.round(loser.avg),
      lift: Math.round(lift * 10) / 10,
      sampleSize,
      confidence: Math.round(confidence * 100) / 100,
      rationale: `${dimension} "${winner.key}" outperforms "${loser.key}" by ${lift.toFixed(1)} points (n=${sampleSize}).`,
    },
  ];
}
