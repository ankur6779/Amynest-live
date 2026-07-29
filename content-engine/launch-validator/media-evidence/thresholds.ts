/**
 * Fail-closed thresholds for evidence-based certification.
 * Missing / inconclusive measurements never pass.
 */

export const EVIDENCE_THRESHOLDS = {
  /** Silent AAC from anullsrc measures ~-91 dB. */
  minMeanVolumeDb: -40,
  minMaxVolumeDb: -18,
  maxSilenceRatio: 0.55,
  /** Continuous bed should not collapse to digital silence. */
  musicFloorDb: -55,
  minSubtitleCoverage: 0.55,
  minTranscriptOverlap: 0.2,
  minCharacterSimilarity: 0.38,
  minAppIconSimilarity: 0.28,
  minEndCardPurpleRatio: 0.12,
  minCtaVisibleSeconds: 1.5,
  minBrandVisibleSeconds: 1.0,
  minEndCardSeconds: 1.8,
  maxBlackSeconds: 0.2,
  maxFreezeSeconds: 1.25,
  requiredWidth: 1080,
  requiredHeight: 1920,
  minDurationSec: 12,
  maxDurationSec: 60,
  minFileBytes: 50_000,
  minSceneChanges: 2,
  minOcrFrames: 3,
} as const;
