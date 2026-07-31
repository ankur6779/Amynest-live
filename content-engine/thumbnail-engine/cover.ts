/**
 * Cover strategy — v2 delegates to live (animated) cover by default.
 * Additive post-process on a finished MP4 (does not change render engines).
 */

import { applyLiveThumbnailCover } from "./live-cover.js";

/**
 * Build a living 1.5–2s cover that matches the thumbnail, then optionally prepend.
 */
export function applyThumbnailCoverStrategy(input: {
  videoPath: string;
  coverStillPath: string;
  outputDir: string;
  /** Cover duration seconds (1–2). Default 1.75. */
  coverSeconds?: number;
  /** When false, only write the cover clip — do not rewrite the master. */
  prependToVideo?: boolean;
}): {
  coverClipPath: string;
  outputVideoPath: string;
  coverApplied: boolean;
} {
  const result = applyLiveThumbnailCover({
    ...input,
    coverSeconds: input.coverSeconds ?? 1.75,
  });
  return {
    coverClipPath: result.coverClipPath,
    outputVideoPath: result.outputVideoPath,
    coverApplied: result.coverApplied,
  };
}
