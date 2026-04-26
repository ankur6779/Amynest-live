/**
 * Parent Hub progressive-content service.
 *
 * Single source of truth for:
 *   1. Computing a child's progress through their current band's tagged media.
 *   2. Evaluating the early-unlock rule (≥75 % triggers next-band unlock).
 *   3. Resolving the unified `previewOnly` flag (DOB-derived + early-unlock).
 *   4. Building the two-section Parent Hub payload consumed by web + mobile.
 *
 * No HTTP / Express in here — keeps the helpers unit-testable without spinning
 * up the server. The `routes/hub-content.ts` handler is a thin wrapper.
 */
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  childrenTable,
  storyContentTable,
  storyWatchProgressTable,
  phonicsContentTable,
  phonicsProgressTable,
  childBandUnlocksTable,
  type StoryContent,
  type PhonicsContentRow,
} from "@workspace/db";
import {
  AGE_BANDS,
  type AgeBand,
  bandIndex,
  getAgeBand,
  getNextAgeBand,
  isKnownBand,
  phonicsBandFor,
} from "../lib/age-bands";
import { logger } from "../lib/logger";

/**
 * Threshold at which the next band is auto-unlocked. The product brief
 * allows 70–80 %; we land at 75 % so completing 3-of-4 items qualifies.
 * Exposed so tests can verify the boundary explicitly.
 */
export const EARLY_UNLOCK_THRESHOLD_PCT = 75;

// ─── Band progress calculator ───────────────────────────────────────────────

export interface BandProgress {
  band: AgeBand;
  storyTotal: number;
  storyFinished: number;
  phonicsTotal: number;
  phonicsFinished: number;
  totalCount: number;
  finishedCount: number;
  /** Integer 0–100. Returns 0 when there is no tagged content for the band. */
  percentage: number;
}

/**
 * Compute how many of the band's tagged media items the child has finished
 * (Stories with `completed = true`, Phonics with `mastered = true`) over the
 * total tagged media count for that band.
 *
 * Universal / untagged content is excluded from BOTH numerator and
 * denominator so it cannot artificially deflate the percentage.
 */
export async function computeBandProgress(
  childId: number,
  userId: string,
  band: AgeBand,
): Promise<BandProgress> {
  // Tagged stories for the band.
  const stories = await db
    .select({ id: storyContentTable.id })
    .from(storyContentTable)
    .where(
      and(
        eq(storyContentTable.active, true),
        eq(storyContentTable.ageBand, band),
      ),
    );
  const storyIds = stories.map((s) => s.id);

  // Tagged phonics for the band — derived from age_group via the deterministic
  // phonicsBandFor mapping. We pull all active phonics rows once and filter
  // in-memory; the catalog is small (≤ a few hundred rows).
  const allPhonics = await db
    .select({
      id: phonicsContentTable.id,
      ageGroup: phonicsContentTable.ageGroup,
    })
    .from(phonicsContentTable)
    .where(eq(phonicsContentTable.active, true));
  const phonicsIds = allPhonics
    .filter((p) => phonicsBandFor(p.ageGroup) === band)
    .map((p) => p.id);

  let storyFinished = 0;
  if (storyIds.length > 0) {
    const finished = await db
      .select({ id: storyWatchProgressTable.id })
      .from(storyWatchProgressTable)
      .where(
        and(
          eq(storyWatchProgressTable.childId, childId),
          eq(storyWatchProgressTable.userId, userId),
          eq(storyWatchProgressTable.completed, true),
          inArray(storyWatchProgressTable.storyId, storyIds),
        ),
      );
    storyFinished = finished.length;
  }

  let phonicsFinished = 0;
  if (phonicsIds.length > 0) {
    const finished = await db
      .select({ id: phonicsProgressTable.id })
      .from(phonicsProgressTable)
      .where(
        and(
          eq(phonicsProgressTable.childId, childId),
          eq(phonicsProgressTable.userId, userId),
          eq(phonicsProgressTable.mastered, true),
          inArray(phonicsProgressTable.contentId, phonicsIds),
        ),
      );
    phonicsFinished = finished.length;
  }

  const totalCount = storyIds.length + phonicsIds.length;
  const finishedCount = storyFinished + phonicsFinished;
  const percentage =
    totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0;

  return {
    band,
    storyTotal: storyIds.length,
    storyFinished,
    phonicsTotal: phonicsIds.length,
    phonicsFinished,
    totalCount,
    finishedCount,
    percentage,
  };
}

// ─── Early-unlock evaluator ─────────────────────────────────────────────────

export interface EarlyUnlockResult {
  evaluated: true;
  childCurrentBand: AgeBand;
  nextBand: AgeBand | null;
  progress: BandProgress;
  /** True when this call upserted a fresh unlock row (first-time crossing). */
  unlockedNow: boolean;
  /** True when the band is unlocked (either by THIS call or a prior call). */
  alreadyUnlocked: boolean;
}

export interface EarlyUnlockSkipped {
  evaluated: false;
  reason:
    | "child_not_found"
    | "no_next_band"
    | "below_threshold"
    | "no_tagged_content";
}

/**
 * Re-run the calculator for the child's current band and, if the threshold
 * is crossed, upsert a `child_band_unlocks` row for the NEXT band with
 * `source = "early_completion"`. The unique index on (child_id, age_band)
 * keeps the operation idempotent and irreversible — un-marking items
 * afterwards leaves the row untouched.
 *
 * Safe to call after every story-progress and phonics-mastered write.
 */
export async function evaluateEarlyUnlock(
  childId: number,
  userId: string,
): Promise<EarlyUnlockResult | EarlyUnlockSkipped> {
  const childRows = await db
    .select({
      id: childrenTable.id,
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  const child = childRows[0];
  if (!child) return { evaluated: false, reason: "child_not_found" };

  const currentBand = getAgeBand(child.age ?? 0, child.ageMonths ?? 0);
  const nextBand = getNextAgeBand(currentBand);
  if (!nextBand) {
    // Already at the highest band — nothing to unlock.
    return { evaluated: false, reason: "no_next_band" };
  }

  const progress = await computeBandProgress(childId, userId, currentBand);
  if (progress.totalCount === 0) {
    return { evaluated: false, reason: "no_tagged_content" };
  }
  if (progress.percentage < EARLY_UNLOCK_THRESHOLD_PCT) {
    return { evaluated: false, reason: "below_threshold" };
  }

  // Idempotent upsert. `onConflictDoNothing` preserves the original
  // unlockedAt + source so re-evaluations after un-marking don't churn.
  const inserted = await db
    .insert(childBandUnlocksTable)
    .values({
      childId,
      userId,
      ageBand: nextBand,
      source: "early_completion",
    })
    .onConflictDoNothing({
      target: [
        childBandUnlocksTable.childId,
        childBandUnlocksTable.ageBand,
      ],
    })
    .returning({ id: childBandUnlocksTable.id });

  return {
    evaluated: true,
    childCurrentBand: currentBand,
    nextBand,
    progress,
    unlockedNow: inserted.length > 0,
    alreadyUnlocked: true,
  };
}

/**
 * Fire-and-forget wrapper used by the progress write paths. Logs but never
 * throws — a failure to evaluate the unlock must not break the user-visible
 * write that triggered it.
 */
export function evaluateEarlyUnlockSafe(
  childId: number,
  userId: string,
): void {
  evaluateEarlyUnlock(childId, userId).catch((err) => {
    logger.warn(
      { err, childId, userId },
      "evaluateEarlyUnlock failed (non-fatal)",
    );
  });
}

// ─── previewOnly resolution (single source of truth) ─────────────────────────

/**
 * Build the set of bands that count as "unlocked" for a given child.
 *
 * An unlock can come from either path; if EITHER says the band is unlocked,
 * it is unlocked. This is the only function in the codebase that decides
 * what "unlocked" means — the route handler, the progress writer, and the
 * tests all consume this.
 */
export function resolveUnlockedBands(
  childCurrentBand: AgeBand,
  earlyUnlockRows: { ageBand: string }[],
): Set<AgeBand> {
  const unlocked = new Set<AgeBand>();
  // DOB-driven: every band ≤ child's current band is unlocked.
  const currentIdx = bandIndex(childCurrentBand);
  for (let i = 0; i <= currentIdx && i < AGE_BANDS.length; i += 1) {
    const band = AGE_BANDS[i];
    if (band) unlocked.add(band);
  }
  // Early-completion rows on top.
  for (const row of earlyUnlockRows) {
    if (isKnownBand(row.ageBand)) unlocked.add(row.ageBand);
  }
  return unlocked;
}

/** True iff the item is unlocked for the child (preview-only is the inverse). */
export function isItemUnlocked(
  itemBand: AgeBand,
  unlockedBands: Set<AgeBand>,
): boolean {
  return unlockedBands.has(itemBand);
}

// ─── Hub-content payload builder ────────────────────────────────────────────

export interface HubStoryDto {
  id: number;
  driveFileId: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  streamUrl: string;
  ageBand: AgeBand | null;
  /** True when surfaced as universal/untagged content in Section 1. */
  isUniversal: boolean;
  previewOnly: boolean;
  /** Per-child progress, only populated when the child has played this story. */
  positionSec?: number;
  playCount?: number;
  completed?: boolean;
}

export interface HubPhonicsDto {
  id: number;
  ageGroup: string;
  band: AgeBand | null;
  level: number;
  type: string;
  symbol: string;
  sound: string;
  example: string | null;
  emoji: string | null;
  hint: string | null;
  conceptId: string | null;
  isUniversal: boolean;
  previewOnly: boolean;
  /** Per-child progress, only populated when the child has played this item. */
  playCount?: number;
  mastered?: boolean;
}

export interface HubContentPayload {
  child: { id: number; name: string };
  currentBand: AgeBand;
  nextBand: AgeBand | null;
  bandProgress: BandProgress;
  nextBandEarlyUnlocked: boolean;
  unlockedBands: AgeBand[];
  section1: {
    stories: HubStoryDto[];
    phonics: HubPhonicsDto[];
  };
  section2: {
    /**
     * "discovery": infants (current band 0-2) get a wide cross-band variety
     *   with no concept grouping.
     * "concept-grouped": age 2+ groups Phonics by `concept_id` (one per
     *   concept, picking the next-higher level) and groups Stories by next
     *   age band, sorted nearest-band-first.
     */
    mode: "discovery" | "concept-grouped";
    stories: HubStoryDto[];
    phonics: HubPhonicsDto[];
  };
}

function storyToDto(
  s: StoryContent,
  band: AgeBand | null,
  isUniversal: boolean,
  previewOnly: boolean,
  progress?: {
    positionSec: number;
    playCount: number;
    completed: boolean;
  } | null,
): HubStoryDto {
  return {
    id: s.id,
    driveFileId: s.driveFileId,
    title: s.title,
    category: s.category,
    thumbnailUrl: s.thumbnailUrl,
    durationSec: s.durationSec,
    streamUrl: `/api/reels/stream/${s.driveFileId}`,
    ageBand: band,
    isUniversal,
    previewOnly,
    ...(progress
      ? {
          positionSec: progress.positionSec,
          playCount: progress.playCount,
          completed: progress.completed,
        }
      : {}),
  };
}

function phonicsToDto(
  p: PhonicsContentRow,
  band: AgeBand | null,
  isUniversal: boolean,
  previewOnly: boolean,
  progress?: { playCount: number; mastered: boolean } | null,
): HubPhonicsDto {
  return {
    id: p.id,
    ageGroup: p.ageGroup,
    band,
    level: p.level,
    type: p.type,
    symbol: p.symbol,
    sound: p.sound,
    example: p.example,
    emoji: p.emoji,
    hint: p.hint,
    conceptId: p.conceptId ?? null,
    isUniversal,
    previewOnly,
    ...(progress
      ? { playCount: progress.playCount, mastered: progress.mastered }
      : {}),
  };
}

/**
 * Build the full Parent Hub payload for a single child. Pure data builder —
 * the caller owns auth + child-ownership checks.
 */
export async function computeHubContent(
  child: { id: number; name: string; age: number; ageMonths: number },
  userId: string,
): Promise<HubContentPayload> {
  const currentBand = getAgeBand(child.age ?? 0, child.ageMonths ?? 0);
  const nextBand = getNextAgeBand(currentBand);

  const [stories, phonics, storyProgress, phonicsProgress, unlockRows] =
    await Promise.all([
      db
        .select()
        .from(storyContentTable)
        .where(eq(storyContentTable.active, true)),
      db
        .select()
        .from(phonicsContentTable)
        .where(eq(phonicsContentTable.active, true)),
      db
        .select()
        .from(storyWatchProgressTable)
        .where(
          and(
            eq(storyWatchProgressTable.childId, child.id),
            eq(storyWatchProgressTable.userId, userId),
          ),
        ),
      db
        .select()
        .from(phonicsProgressTable)
        .where(
          and(
            eq(phonicsProgressTable.childId, child.id),
            eq(phonicsProgressTable.userId, userId),
          ),
        ),
      db
        .select()
        .from(childBandUnlocksTable)
        .where(
          and(
            eq(childBandUnlocksTable.childId, child.id),
            eq(childBandUnlocksTable.userId, userId),
          ),
        ),
    ]);

  const unlockedBands = resolveUnlockedBands(currentBand, unlockRows);

  const storyProgressById = new Map(storyProgress.map((p) => [p.storyId, p]));
  const phonicsProgressById = new Map(
    phonicsProgress.map((p) => [p.contentId, p]),
  );

  // Compute current band progress (universal items don't count).
  const bandProgress = await computeBandProgress(
    child.id,
    userId,
    currentBand,
  );

  // ── Section 1: current-band tagged + universal/untagged ─────────────────
  const section1Stories: HubStoryDto[] = [];
  const section1Phonics: HubPhonicsDto[] = [];

  // ── Section 2: future content (any band > current) ──────────────────────
  const section2StoriesRaw: { story: StoryContent; band: AgeBand }[] = [];
  const section2PhonicsRaw: { item: PhonicsContentRow; band: AgeBand }[] = [];

  const currentIdx = bandIndex(currentBand);

  for (const s of stories) {
    const band = isKnownBand(s.ageBand) ? s.ageBand : null;
    if (band === null) {
      // Universal / untagged → Section 1, always unlocked.
      section1Stories.push(
        storyToDto(s, null, true, false, storyProgressById.get(s.id) ?? null),
      );
      continue;
    }
    const idx = bandIndex(band);
    if (idx <= currentIdx) {
      // Current band or below → Section 1.
      section1Stories.push(
        storyToDto(
          s,
          band,
          false,
          false,
          storyProgressById.get(s.id) ?? null,
        ),
      );
    } else {
      // Higher band → Section 2.
      section2StoriesRaw.push({ story: s, band });
    }
  }

  for (const p of phonics) {
    const band = phonicsBandFor(p.ageGroup);
    if (band === null) {
      // Untagged / unmappable → Section 1 universal.
      section1Phonics.push(
        phonicsToDto(
          p,
          null,
          true,
          false,
          phonicsProgressById.get(p.id) ?? null,
        ),
      );
      continue;
    }
    const idx = bandIndex(band);
    if (idx <= currentIdx) {
      section1Phonics.push(
        phonicsToDto(
          p,
          band,
          false,
          false,
          phonicsProgressById.get(p.id) ?? null,
        ),
      );
    } else {
      section2PhonicsRaw.push({ item: p, band });
    }
  }

  // Sort Section 1 stories: tagged first (by band), then universal.
  section1Stories.sort((a, b) => {
    if (a.isUniversal !== b.isUniversal) return a.isUniversal ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
  section1Phonics.sort((a, b) => {
    if (a.isUniversal !== b.isUniversal) return a.isUniversal ? 1 : -1;
    return a.level - b.level;
  });

  // ── Section 2 grouping ──────────────────────────────────────────────────
  const isInfant = currentBand === "0-2";
  const mode: "discovery" | "concept-grouped" = isInfant
    ? "discovery"
    : "concept-grouped";

  let section2Stories: HubStoryDto[];
  let section2Phonics: HubPhonicsDto[];

  // Stories: always grouped by next-band, sorted nearest-band-first. The
  // task brief explicitly keeps Stories Section 2 as "next age band, no
  // concept grouping" for both infant and age-2+ children.
  section2StoriesRaw.sort((a, b) => {
    const ai = bandIndex(a.band);
    const bi = bandIndex(b.band);
    if (ai !== bi) return ai - bi;
    return a.story.title.localeCompare(b.story.title);
  });
  section2Stories = section2StoriesRaw.map(({ story, band }) =>
    storyToDto(
      story,
      band,
      false,
      !isItemUnlocked(band, unlockedBands),
      storyProgressById.get(story.id) ?? null,
    ),
  );

  if (isInfant) {
    // Discovery mode: surface ALL future phonics, sorted nearest-band-first
    // and within a band by level. No concept grouping.
    section2PhonicsRaw.sort((a, b) => {
      const ai = bandIndex(a.band);
      const bi = bandIndex(b.band);
      if (ai !== bi) return ai - bi;
      return a.item.level - b.item.level;
    });
    section2Phonics = section2PhonicsRaw.map(({ item, band }) =>
      phonicsToDto(
        item,
        band,
        false,
        !isItemUnlocked(band, unlockedBands),
        phonicsProgressById.get(item.id) ?? null,
      ),
    );
  } else {
    // Concept-grouped: per concept_id, pick the lowest-band item that is
    // higher than the child's current band ("next-higher level per concept").
    // Items without a concept_id are kept too (sorted nearest-band-first)
    // because we don't have a different organising key for them and dropping
    // them would silently hide content.
    const byConcept = new Map<
      string,
      { item: PhonicsContentRow; band: AgeBand }
    >();
    const noConcept: { item: PhonicsContentRow; band: AgeBand }[] = [];

    for (const entry of section2PhonicsRaw) {
      const cid = entry.item.conceptId;
      if (!cid) {
        noConcept.push(entry);
        continue;
      }
      const current = byConcept.get(cid);
      if (!current) {
        byConcept.set(cid, entry);
        continue;
      }
      // Prefer the lower band (closer to child); within same band, lower level.
      const curIdx = bandIndex(current.band);
      const newIdx = bandIndex(entry.band);
      if (
        newIdx < curIdx ||
        (newIdx === curIdx && entry.item.level < current.item.level)
      ) {
        byConcept.set(cid, entry);
      }
    }

    const conceptPicks = Array.from(byConcept.values());
    conceptPicks.sort((a, b) => {
      const ai = bandIndex(a.band);
      const bi = bandIndex(b.band);
      if (ai !== bi) return ai - bi;
      return a.item.level - b.item.level;
    });
    noConcept.sort((a, b) => {
      const ai = bandIndex(a.band);
      const bi = bandIndex(b.band);
      if (ai !== bi) return ai - bi;
      return a.item.level - b.item.level;
    });

    section2Phonics = [...conceptPicks, ...noConcept].map(({ item, band }) =>
      phonicsToDto(
        item,
        band,
        false,
        !isItemUnlocked(band, unlockedBands),
        phonicsProgressById.get(item.id) ?? null,
      ),
    );
  }

  const nextBandEarlyUnlocked =
    !!nextBand &&
    unlockRows.some(
      (r) => r.ageBand === nextBand && r.source === "early_completion",
    );

  return {
    child: { id: child.id, name: child.name },
    currentBand,
    nextBand,
    bandProgress,
    nextBandEarlyUnlocked,
    unlockedBands: Array.from(unlockedBands),
    section1: { stories: section1Stories, phonics: section1Phonics },
    section2: { mode, stories: section2Stories, phonics: section2Phonics },
  };
}
