/**
 * Permanent knowledge base — never lose historical winning patterns.
 */

import { createHash } from "node:crypto";
import type {
  CorrelationInsight,
  KnowledgeEntry,
  PlatformPerformance,
  VideoDna,
} from "../types.js";

export interface KnowledgeBaseStore {
  list(): KnowledgeEntry[];
  upsert(entry: KnowledgeEntry): void;
  rememberFromLearning(input: {
    dnaList: VideoDna[];
    performances: PlatformPerformance[];
    correlations: CorrelationInsight[];
  }): KnowledgeEntry[];
}

export class InMemoryKnowledgeBaseStore implements KnowledgeBaseStore {
  private readonly byId = new Map<string, KnowledgeEntry>();

  constructor(seed: KnowledgeEntry[] = []) {
    for (const entry of seed) this.byId.set(entry.id, entry);
  }

  list(): KnowledgeEntry[] {
    return [...this.byId.values()].sort((a, b) => b.score - a.score);
  }

  upsert(entry: KnowledgeEntry): void {
    const existing = this.byId.get(entry.id);
    if (!existing) {
      this.byId.set(entry.id, entry);
      return;
    }
    this.byId.set(entry.id, {
      ...existing,
      score: Math.max(existing.score, entry.score),
      evidenceVideoIds: unique([
        ...existing.evidenceVideoIds,
        ...entry.evidenceVideoIds,
      ]).slice(0, 20),
      updatedAt: entry.updatedAt,
      notes: entry.notes || existing.notes,
    });
  }

  rememberFromLearning(input: {
    dnaList: VideoDna[];
    performances: PlatformPerformance[];
    correlations: CorrelationInsight[];
  }): KnowledgeEntry[] {
    const now = new Date().toISOString();
    const byVideo = new Map(input.performances.map((p) => [p.videoId, p]));
    const top = input.dnaList
      .map((dna) => ({ dna, perf: byVideo.get(dna.videoId) }))
      .filter((r): r is { dna: VideoDna; perf: PlatformPerformance } => Boolean(r.perf))
      .sort((a, b) => b.perf.performanceScore - a.perf.performanceScore)
      .slice(0, 8);

    const created: KnowledgeEntry[] = [];

    for (const row of top) {
      created.push(
        entry("winning-hook", row.dna.hook, row.perf.performanceScore, [row.dna.videoId], now, "Top-performing hook text"),
        entry("winning-emotion", row.dna.emotion, row.perf.performanceScore, [row.dna.videoId], now, "Emotion tied to strong retention"),
        entry("winning-cta", row.dna.ctaText, row.perf.performanceScore, [row.dna.videoId], now, "CTA variant on a winner"),
        entry(
          "winning-duration",
          `${row.dna.durationSeconds}s`,
          row.perf.performanceScore,
          [row.dna.videoId],
          now,
          "Duration of a high performer",
        ),
        entry(
          "winning-schedule",
          `${row.dna.dayOfWeek} ${String(row.dna.publishHour).padStart(2, "0")}:00`,
          row.perf.performanceScore,
          [row.dna.videoId],
          now,
          "Publish slot of a winner",
        ),
        entry(
          "winning-music",
          row.dna.musicStyle,
          row.perf.performanceScore,
          [row.dna.videoId],
          now,
          "Music style on a winner",
        ),
        entry(
          "winning-camera",
          row.dna.cameraStyle,
          row.perf.performanceScore,
          [row.dna.videoId],
          now,
          "Camera style on a winner",
        ),
        entry(
          "winning-thumbnail",
          row.dna.thumbnailStyle,
          row.perf.performanceScore,
          [row.dna.videoId],
          now,
          "Thumbnail style on a winner",
        ),
        entry(
          "winning-visual",
          `${row.dna.cameraStyle}+${row.dna.thumbnailStyle}`,
          row.perf.performanceScore,
          [row.dna.videoId],
          now,
          "Visual combo on a winner",
        ),
        entry(
          "winning-story",
          `${row.dna.hookStyle}→${row.dna.emotion}→${row.dna.ctaVariant}`,
          row.perf.performanceScore,
          [row.dna.videoId],
          now,
          "Story structure DNA of a winner",
        ),
      );
    }

    for (const corr of input.correlations.slice(0, 12)) {
      created.push(
        entry(
          mapCorrKind(corr.dimension),
          corr.winner,
          corr.winnerScore,
          [],
          now,
          corr.rationale,
        ),
      );
    }

    for (const item of created) this.upsert(item);
    return created;
  }
}

function entry(
  kind: KnowledgeEntry["kind"],
  value: string,
  score: number,
  evidenceVideoIds: string[],
  updatedAt: string,
  notes: string,
): KnowledgeEntry {
  const id = `kb_${createHash("sha256")
    .update(`${kind}|${value}`)
    .digest("hex")
    .slice(0, 12)}`;
  return { id, kind, value, score, evidenceVideoIds, updatedAt, notes };
}

function mapCorrKind(dimension: CorrelationInsight["dimension"]): KnowledgeEntry["kind"] {
  switch (dimension) {
    case "hookStyle":
      return "winning-hook";
    case "emotion":
      return "winning-emotion";
    case "ctaVariant":
      return "winning-cta";
    case "duration":
      return "winning-duration";
    case "publishHour":
      return "winning-schedule";
    case "musicStyle":
      return "winning-music";
    case "cameraStyle":
      return "winning-camera";
    default:
      return "winning-story";
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
