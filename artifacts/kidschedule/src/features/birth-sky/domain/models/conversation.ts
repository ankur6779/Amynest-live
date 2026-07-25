/** Birth Sky AI conversation models (Pack 6). Messages are immutable after save. */

export type ConversationEntryPoint =
  | "reflect"
  | "tradition"
  | "sky"
  | "astronomy"
  | "resume";

export type ConversationMachineState =
  | "idle"
  | "creating"
  | "streaming"
  | "completed"
  | "cancelled"
  | "failed"
  | "moderated"
  | "expired"
  | "resume_pending";

export type BirthSkyConversation = {
  conversationId: string;
  profileId?: string;
  snapshotVersion: string;
  engineVersion: string;
  entryPoint: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

export type BirthSkyMessage = {
  messageId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  body: string;
  sequence: number;
  jobId?: string | null;
  deliveryId?: string | null;
  modelVersion?: string | null;
  contextSchemaVersion?: string | null;
  snapshotVersion?: string | null;
  engineVersion?: string | null;
  status: string;
  createdAt: string;
};

export type AiEntitlementMirror = {
  canRequestAiInsight: boolean;
  isPremium: boolean;
  aiInsightsUsedCount: number;
  freeInsightRemaining: number | null;
};

export type PendingAiIntent = {
  stashedAt: number;
  ttlMs: number;
  profileId: string;
  conversationId: string | null;
  entryPoint: ConversationEntryPoint;
  snapshotVersion: string;
  /** Context keys only — never prompt text. */
  traditionCardId?: string;
  bodyKey?: string;
};

export const PENDING_AI_TTL_MS = 15 * 60 * 1000;
