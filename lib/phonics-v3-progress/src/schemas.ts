import { z } from "zod";

const dimensionCountsSchema = z.object({
  heard: z.number().int().nonnegative(),
  blended: z.number().int().nonnegative(),
  identified: z.number().int().nonnegative(),
  spoken: z.number().int().nonnegative(),
});

const masteryRecordSchema = z.object({
  id: z.string(),
  type: z.enum(["word", "letter", "phoneme", "family"]),
  counts: dimensionCountsSchema,
  score: z.number().int().min(0).max(100),
  band: z.enum(["learning", "practicing", "strong", "mastered"]),
  isMastered: z.boolean(),
  firstSeenAt: z.number(),
  lastActivityAt: z.number(),
  history: z.array(z.object({ dateKey: z.string(), score: z.number() })),
});

export const masteryPayloadSchema = z.object({
  words: z.record(masteryRecordSchema),
  letters: z.record(masteryRecordSchema),
  phonemes: z.record(masteryRecordSchema),
  families: z.record(masteryRecordSchema),
  version: z.literal(3),
});

export const fluencyPayloadSchema = z.object({
  streakDays: z.number().int().nonnegative(),
  lastActiveDate: z.string(),
  wordsAttemptedTotal: z.number().int().nonnegative(),
  wordsCompletedTotal: z.number().int().nonnegative(),
  storiesCompletedTotal: z.number().int().nonnegative(),
  daily: z.array(
    z.object({
      dateKey: z.string(),
      wordsAttempted: z.number().int().nonnegative(),
      wordsCompleted: z.number().int().nonnegative(),
      storiesCompleted: z.number().int().nonnegative(),
      fluencyScore: z.number().int().min(0).max(100),
    }),
  ),
  version: z.literal(3),
});

export const storyProgressPayloadSchema = z.object({
  completed: z.record(
    z.object({
      completedAt: z.number(),
      readCount: z.number().int().nonnegative(),
    }),
  ),
  version: z.literal(3),
});

export const missionPayloadSchema = z.object({
  dateKey: z.string(),
  tasks: z.array(
    z.object({
      slot: z.enum(["review", "practice", "new_word", "challenge", "story"]),
      id: z.string(),
      emoji: z.string(),
      label: z.string(),
      word: z.string().optional(),
      familyId: z.string().optional(),
      storyId: z.string().optional(),
      completed: z.boolean(),
    }),
  ),
  estimatedMinutes: z.number().int().positive(),
  streakDay: z.number().int().nonnegative(),
  completed: z.boolean(),
});

const retentionTrackSchema = z.object({
  id: z.string(),
  type: z.enum(["word", "letter", "phoneme", "family"]),
  introducedAt: z.number(),
  lastReviewedAt: z.number().nullable(),
  reviewStage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  nextReviewAt: z.number(),
  retentionScore: z.number().int().min(0).max(100),
  failStreak: z.number().int().nonnegative(),
  passStreak: z.number().int().nonnegative(),
});

export const retentionPayloadSchema = z.object({
  tracks: z.record(retentionTrackSchema),
  version: z.literal(3),
});

export const syncBatchBodySchema = z.object({
  childId: z.number().int().positive(),
  mastery: z
    .object({ payload: masteryPayloadSchema, clientUpdatedAt: z.number().int().positive() })
    .optional(),
  fluency: z
    .object({ payload: fluencyPayloadSchema, clientUpdatedAt: z.number().int().positive() })
    .optional(),
  stories: z
    .object({ payload: storyProgressPayloadSchema, clientUpdatedAt: z.number().int().positive() })
    .optional(),
  missions: z
    .object({ payload: missionPayloadSchema, clientUpdatedAt: z.number().int().positive() })
    .optional(),
  retention: z
    .object({ payload: retentionPayloadSchema, clientUpdatedAt: z.number().int().positive() })
    .optional(),
});

export const patchProgressBodySchema = z.object({
  childId: z.number().int().positive(),
  domain: z.enum(["mastery", "fluency", "stories", "missions", "retention"]),
  payload: z.union([
    masteryPayloadSchema,
    fluencyPayloadSchema,
    storyProgressPayloadSchema,
    missionPayloadSchema,
    retentionPayloadSchema,
  ]),
  clientUpdatedAt: z.number().int().positive(),
});

export const postProgressBodySchema = z.object({
  childId: z.number().int().positive(),
  mastery: masteryPayloadSchema.optional(),
  fluency: fluencyPayloadSchema.optional(),
  stories: storyProgressPayloadSchema.optional(),
  missions: missionPayloadSchema.optional(),
  retention: retentionPayloadSchema.optional(),
  clientUpdatedAt: z.number().int().positive(),
});
