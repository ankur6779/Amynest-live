/**
 * A/B history — top 100 / worst 100 thumbnails (never forget).
 */

import { recordsByCtr } from "./store.js";
import type { ThumbnailLearningRecord } from "./types.js";

export function refreshAbHistory(records: ThumbnailLearningRecord[]): {
  top100: ThumbnailLearningRecord[];
  worst100: ThumbnailLearningRecord[];
  topIds: string[];
  worstIds: string[];
} {
  const top100 = recordsByCtr(records, "desc", 100);
  const worst100 = recordsByCtr(records, "asc", 100);
  return {
    top100,
    worst100,
    topIds: top100.map((r) => r.id),
    worstIds: worst100.map((r) => r.id),
  };
}
