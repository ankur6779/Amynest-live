/**
 * Phase G.5 / Phase 8 — mandatory human audio review gate spec.
 *
 * ElevenLabs regeneration is BLOCKED until a human reviewer signs off every
 * phoneme category below. This module is the single source of truth for which
 * categories must be reviewed and what a valid approval looks like; the script
 * layer loads the signed approval file and asserts against this spec.
 */

/** The phoneme categories a human must listen to and approve before regen. */
export const PHONICS_REVIEW_CATEGORIES = [
  "short_vowels",
  "long_vowels",
  "digraphs",
  "trigraphs",
  "blends",
  "r_controlled_vowels",
  "schwa",
  "diphthongs",
  "voiced_th",
  "unvoiced_th",
] as const;

export type PhonicsReviewCategory = (typeof PHONICS_REVIEW_CATEGORIES)[number];

export type CategoryReview = {
  /** "approved" is the ONLY value that unblocks regeneration. */
  status: "pending" | "approved" | "rejected";
  /** Free-text reviewer notes (defects heard, sample words checked). */
  notes?: string;
};

export type AudioReviewApproval = {
  /** Must match the curriculum version being regenerated (forces re-review). */
  curriculumVersion: number;
  phonemeVersion: number;
  reviewer: string;
  reviewedAt: string;
  categories: Partial<Record<PhonicsReviewCategory, CategoryReview>>;
};

export type ReviewGateIssue = { category: PhonicsReviewCategory | "meta"; problem: string };

/**
 * Certification gate. Returns the list of blocking issues; empty array == GO.
 * Requires: named reviewer, ISO timestamp, matching versions, and every
 * category explicitly "approved".
 */
export function validateAudioReviewApproval(
  approval: Partial<AudioReviewApproval> | undefined,
  expected: { curriculumVersion: number; phonemeVersion: number },
): ReviewGateIssue[] {
  const issues: ReviewGateIssue[] = [];
  const a = approval ?? {};

  if (typeof a.reviewer !== "string" || a.reviewer.trim().length < 2) {
    issues.push({ category: "meta", problem: "missing reviewer name" });
  }
  if (typeof a.reviewedAt !== "string" || Number.isNaN(Date.parse(a.reviewedAt))) {
    issues.push({ category: "meta", problem: "missing/invalid reviewedAt ISO timestamp" });
  }
  if (a.curriculumVersion !== expected.curriculumVersion) {
    issues.push({
      category: "meta",
      problem: `curriculumVersion ${a.curriculumVersion} != expected ${expected.curriculumVersion}`,
    });
  }
  if (a.phonemeVersion !== expected.phonemeVersion) {
    issues.push({
      category: "meta",
      problem: `phonemeVersion ${a.phonemeVersion} != expected ${expected.phonemeVersion}`,
    });
  }

  for (const cat of PHONICS_REVIEW_CATEGORIES) {
    const review = a.categories?.[cat];
    if (!review) {
      issues.push({ category: cat, problem: "no review entry" });
      continue;
    }
    if (review.status !== "approved") {
      issues.push({ category: cat, problem: `status="${review.status}" (must be "approved")` });
    }
  }

  return issues;
}

export function isAudioReviewApproved(
  approval: Partial<AudioReviewApproval> | undefined,
  expected: { curriculumVersion: number; phonemeVersion: number },
): boolean {
  return validateAudioReviewApproval(approval, expected).length === 0;
}
