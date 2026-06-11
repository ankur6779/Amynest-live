/** JSON-safe Phonics V3 payloads — shared by client and API. */

export type MasteryDimension = "heard" | "blended" | "identified" | "spoken";

export type DimensionCounts = Record<MasteryDimension, number>;

export type MasteryRecordJson = {
  id: string;
  type: "word" | "letter" | "phoneme" | "family";
  counts: DimensionCounts;
  score: number;
  band: "learning" | "practicing" | "strong" | "mastered";
  isMastered: boolean;
  firstSeenAt: number;
  lastActivityAt: number;
  history: { dateKey: string; score: number }[];
};

export type PhonicsMasteryPayload = {
  words: Record<string, MasteryRecordJson>;
  letters: Record<string, MasteryRecordJson>;
  phonemes: Record<string, MasteryRecordJson>;
  families: Record<string, MasteryRecordJson>;
  version: 3;
};

export type FluencyDailySnapshot = {
  dateKey: string;
  wordsAttempted: number;
  wordsCompleted: number;
  storiesCompleted: number;
  fluencyScore: number;
};

export type PhonicsFluencyPayload = {
  streakDays: number;
  lastActiveDate: string;
  wordsAttemptedTotal: number;
  wordsCompletedTotal: number;
  storiesCompletedTotal: number;
  daily: FluencyDailySnapshot[];
  version: 3;
};

export type StoryCompletionRecord = {
  completedAt: number;
  readCount: number;
};

export type PhonicsStoryProgressPayload = {
  completed: Record<string, StoryCompletionRecord>;
  version: 3;
};

export type DailyMissionTaskJson = {
  slot: "review" | "practice" | "new_word" | "challenge" | "story";
  id: string;
  emoji: string;
  label: string;
  word?: string;
  familyId?: string;
  storyId?: string;
  completed: boolean;
};

export type PhonicsMissionPayload = {
  dateKey: string;
  tasks: DailyMissionTaskJson[];
  estimatedMinutes: number;
  streakDay: number;
  completed: boolean;
};

export type RetentionTrackPayload = {
  id: string;
  type: "word" | "letter" | "phoneme" | "family";
  introducedAt: number;
  lastReviewedAt: number | null;
  reviewStage: 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number;
  retentionScore: number;
  failStreak: number;
  passStreak: number;
};

export type PhonicsRetentionPayload = {
  tracks: Record<string, RetentionTrackPayload>;
  version: 3;
};

export type PhonicsV3Domain = "mastery" | "fluency" | "stories" | "missions" | "retention";

export type PhonicsV3DomainPayload = {
  mastery: PhonicsMasteryPayload;
  fluency: PhonicsFluencyPayload;
  stories: PhonicsStoryProgressPayload;
  missions: PhonicsMissionPayload | null;
  retention: PhonicsRetentionPayload;
};

export type PhonicsV3DomainEnvelope<T> = {
  payload: T;
  clientUpdatedAt: number;
};

export type PhonicsV3ProgressBundle = {
  mastery: PhonicsV3DomainEnvelope<PhonicsMasteryPayload> | null;
  fluency: PhonicsV3DomainEnvelope<PhonicsFluencyPayload> | null;
  stories: PhonicsV3DomainEnvelope<PhonicsStoryProgressPayload> | null;
  missions: PhonicsV3DomainEnvelope<PhonicsMissionPayload> | null;
  retention: PhonicsV3DomainEnvelope<PhonicsRetentionPayload> | null;
};
