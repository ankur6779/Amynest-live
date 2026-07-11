/**
 * Canonical AI worksheet response contract.
 * Parser and renderer must only see documents built from a VALID contract.
 */
import { z } from "zod";
import {
  WORKSHEET_GENERATOR_VERSION,
  WORKSHEET_LAYOUT_VERSION,
  WORKSHEET_SCHEMA_VERSION,
} from "./live-pipeline-audit.js";
import { A4_HEIGHT, A4_WIDTH } from "./types.js";

export const AI_WORKSHEET_GENERATOR_VERSION = "worksheet-ai-v1";

export const AI_QUESTION_TYPES = [
  "colour",
  "circle",
  "match",
  "trace",
  "draw",
  "join",
  "tick",
  "cross",
  "cut_paste",
  "fill_blank",
  "missing_letters",
  "beginning_sounds",
  "odd_one_out",
  "count",
  "pattern",
  "sorting",
  "picture_recognition",
  "reading",
  "short_sentences",
  "phonics",
  "writing",
  "math",
  "evs",
  "hindi",
] as const;

const nonempty = z.string().trim().min(1);

export const AiWorksheetQuestionSchema = z
  .object({
    id: nonempty,
    questionType: z.enum(AI_QUESTION_TYPES),
    prompt: nonempty,
    pageNumber: z.number().int().positive(),
    options: z.array(nonempty).nullable(),
    answerLine: z.boolean(),
    illustrationEmoji: z.string().nullable(),
    illustrationLabel: z.string().nullable(),
    answer: z.string().nullable(),
  })
  .strict();

export const AiWorksheetPageSchema = z
  .object({
    pageNumber: z.number().int().positive(),
    questionIds: z.array(nonempty).min(1),
  })
  .strict();

export const AiWorksheetPageSizeSchema = z
  .object({
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
  })
  .strict();

/** ONE canonical AI response schema — no optional root fields. */
export const AiWorksheetResponseSchema = z
  .object({
    schemaVersion: z.literal(WORKSHEET_SCHEMA_VERSION),
    layoutVersion: z.literal(WORKSHEET_LAYOUT_VERSION),
    generatorVersion: z.literal(AI_WORKSHEET_GENERATOR_VERSION),
    title: nonempty,
    topic: nonempty,
    prompt: nonempty,
    pageSize: AiWorksheetPageSizeSchema,
    pages: z.array(AiWorksheetPageSchema).min(1),
    questions: z.array(AiWorksheetQuestionSchema).min(1),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = data.questions.map((q) => q.id);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate question id: ${id}` });
      }
      seen.add(id);
    }

    const byId = new Map(data.questions.map((q) => [q.id, q]));
    for (const page of data.pages) {
      for (const qid of page.questionIds) {
        const q = byId.get(qid);
        if (!q) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `page ${page.pageNumber} references unknown questionId ${qid}`,
          });
          continue;
        }
        if (q.pageNumber !== page.pageNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `question ${qid} pageNumber ${q.pageNumber} != page ${page.pageNumber}`,
          });
        }
      }
    }

    for (const q of data.questions) {
      const onPage = data.pages.some((p) => p.questionIds.includes(q.id));
      if (!onPage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `question ${q.id} not listed on any page`,
        });
      }
      if (!Number.isFinite(q.pageNumber)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `NaN pageNumber on ${q.id}` });
      }
    }

    if (
      !Number.isFinite(data.pageSize.width) ||
      !Number.isFinite(data.pageSize.height) ||
      data.pageSize.width <= 0 ||
      data.pageSize.height <= 0
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid pageSize geometry" });
    }
  });

export type AiWorksheetResponse = z.infer<typeof AiWorksheetResponseSchema>;

export type AiContractValidationResult =
  | { ok: true; data: AiWorksheetResponse }
  | { ok: false; errors: string[]; raw: unknown };

/** Validate raw JSON. Never mutates. VALID or FAIL — no partial recovery. */
export function validateAiWorksheetResponse(raw: unknown): AiContractValidationResult {
  if (raw === null || raw === undefined) {
    return { ok: false, errors: ["response is null/undefined"], raw };
  }
  const parsed = AiWorksheetResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`),
      raw,
    };
  }
  if (parsed.data.schemaVersion !== WORKSHEET_SCHEMA_VERSION) {
    return { ok: false, errors: [`schemaVersion mismatch`], raw };
  }
  if (parsed.data.layoutVersion !== WORKSHEET_LAYOUT_VERSION) {
    return { ok: false, errors: [`layoutVersion mismatch`], raw };
  }
  if (parsed.data.generatorVersion !== AI_WORKSHEET_GENERATOR_VERSION) {
    return { ok: false, errors: [`generatorVersion mismatch`], raw };
  }
  return { ok: true, data: parsed.data };
}

/** OpenAI strict json_schema for structured outputs (mirrors Zod contract). */
export const WORKSHEET_AI_OPENAI_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "layoutVersion",
    "generatorVersion",
    "title",
    "topic",
    "prompt",
    "pageSize",
    "pages",
    "questions",
  ],
  properties: {
    schemaVersion: { type: "integer", enum: [WORKSHEET_SCHEMA_VERSION] },
    layoutVersion: { type: "integer", enum: [WORKSHEET_LAYOUT_VERSION] },
    generatorVersion: { type: "string", enum: [AI_WORKSHEET_GENERATOR_VERSION] },
    title: { type: "string", minLength: 1 },
    topic: { type: "string", minLength: 1 },
    prompt: { type: "string", minLength: 1 },
    pageSize: {
      type: "object",
      additionalProperties: false,
      required: ["width", "height"],
      properties: {
        width: { type: "number" },
        height: { type: "number" },
      },
    },
    pages: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pageNumber", "questionIds"],
        properties: {
          pageNumber: { type: "integer", minimum: 1 },
          questionIds: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 },
          },
        },
      },
    },
    questions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "questionType",
          "prompt",
          "pageNumber",
          "options",
          "answerLine",
          "illustrationEmoji",
          "illustrationLabel",
          "answer",
        ],
        properties: {
          id: { type: "string", minLength: 1 },
          questionType: { type: "string", enum: [...AI_QUESTION_TYPES] },
          prompt: { type: "string", minLength: 1 },
          pageNumber: { type: "integer", minimum: 1 },
          options: {
            type: ["array", "null"],
            items: { type: "string" },
          },
          answerLine: { type: "boolean" },
          illustrationEmoji: { type: ["string", "null"] },
          illustrationLabel: { type: ["string", "null"] },
          answer: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

export function defaultA4PageSize(): { width: number; height: number } {
  return { width: A4_WIDTH, height: A4_HEIGHT };
}

export function buildContractFixture(overrides?: Partial<AiWorksheetResponse>): AiWorksheetResponse {
  const q1 = {
    id: "q1",
    questionType: "colour" as const,
    prompt: "Colour the fish",
    pageNumber: 1,
    options: null,
    answerLine: false,
    illustrationEmoji: "🐟",
    illustrationLabel: "fish",
    answer: null,
  };
  const q2 = {
    id: "q2",
    questionType: "fill_blank" as const,
    prompt: "The ___ swims in the sea",
    pageNumber: 1,
    options: null,
    answerLine: true,
    illustrationEmoji: null,
    illustrationLabel: null,
    answer: null,
  };
  const base: AiWorksheetResponse = {
    schemaVersion: WORKSHEET_SCHEMA_VERSION,
    layoutVersion: WORKSHEET_LAYOUT_VERSION,
    generatorVersion: AI_WORKSHEET_GENERATOR_VERSION,
    title: "Sea Animals",
    topic: "Sea Animals",
    prompt: "sea animals UKG",
    pageSize: defaultA4PageSize(),
    pages: [{ pageNumber: 1, questionIds: ["q1", "q2"] }],
    questions: [q1, q2],
  };
  return { ...base, ...overrides, pageSize: overrides?.pageSize ?? base.pageSize };
}

/** In-memory health metrics for AI contract generation. */
export type AiContractMetricsSnapshot = {
  attempts: number;
  successes: number;
  schemaFailures: number;
  retries: number;
  fallbacks: number;
  totalRetryCount: number;
  aiSuccessPercent: number;
  fallbackPercent: number;
  averageRetryCount: number;
};

const metricsState = {
  attempts: 0,
  successes: 0,
  schemaFailures: 0,
  retries: 0,
  fallbacks: 0,
  totalRetryCount: 0,
};

export function recordAiContractAttempt(opts: {
  success: boolean;
  schemaFailure?: boolean;
  usedRetry?: boolean;
  retryCount?: number;
  usedFallback?: boolean;
}) {
  metricsState.attempts += 1;
  if (opts.success) metricsState.successes += 1;
  if (opts.schemaFailure) metricsState.schemaFailures += 1;
  if (opts.usedRetry) metricsState.retries += 1;
  if (opts.retryCount) metricsState.totalRetryCount += opts.retryCount;
  if (opts.usedFallback) metricsState.fallbacks += 1;
}

export function getAiContractHealth(): AiContractMetricsSnapshot {
  const attempts = metricsState.attempts || 0;
  return {
    ...metricsState,
    aiSuccessPercent: attempts === 0 ? 0 : (metricsState.successes / attempts) * 100,
    fallbackPercent: attempts === 0 ? 0 : (metricsState.fallbacks / attempts) * 100,
    averageRetryCount: attempts === 0 ? 0 : metricsState.totalRetryCount / attempts,
  };
}

export function resetAiContractHealth() {
  metricsState.attempts = 0;
  metricsState.successes = 0;
  metricsState.schemaFailures = 0;
  metricsState.retries = 0;
  metricsState.fallbacks = 0;
  metricsState.totalRetryCount = 0;
}

/** Dev-only raw AI response ring buffer (never mutated after push). */
const RAW_LOG_MAX = 20;
const rawLog: Array<{ at: string; responseId: string; attempt: number; raw: unknown }> = [];

export function storeRawAiResponse(entry: {
  responseId: string;
  attempt: number;
  raw: unknown;
}) {
  rawLog.unshift({
    at: new Date().toISOString(),
    responseId: entry.responseId,
    attempt: entry.attempt,
    raw: structuredClone(entry.raw),
  });
  if (rawLog.length > RAW_LOG_MAX) rawLog.length = RAW_LOG_MAX;
}

export function listRawAiResponses() {
  return rawLog.map((e) => ({ ...e }));
}

export function downloadableRawAiResponsesJson(): string {
  return JSON.stringify({ responses: listRawAiResponses(), health: getAiContractHealth() }, null, 2);
}

export {
  WORKSHEET_SCHEMA_VERSION,
  WORKSHEET_LAYOUT_VERSION,
  WORKSHEET_GENERATOR_VERSION,
};
