import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger.js";
import { aiUsageGate } from "../middlewares/aiUsageGate.js";
import { hubModuleGate } from "../middlewares/hubModuleGate.js";
import { submitAiJobAndRespond } from "../lib/ai-queue-http.js";
import type { OpenAiChatPayload } from "../services/ai-job-handlers.js";
import {
  buildWorksheetAiSystemPrompt,
  buildWorksheetAiUserPrompt,
  buildFallbackDocument,
  parseAiWorksheetResponse,
  parseCopilotCommand,
  buildCopilotAiSystemPrompt,
  buildCopilotAiUserPrompt,
  parseCopilotAiResponse,
  finalizeWorksheet,
  scoreWorksheet,
  enhancePromptLocal,
  buildEnhancePromptSystemPrompt,
  buildEnhancePromptUserPayload,
  analyzeReferences,
  mergeReferenceAnalyses,
  buildVisionAnalysisSystemPrompt,
  buildVisionAnalysisUserPayload,
} from "@workspace/worksheet-studio";
import type { EnhancePromptRequest, WorksheetDocument, WorksheetGenerateRequest, WorksheetReferenceContext } from "@workspace/worksheet-studio";

const router: IRouter = Router();

const MODEL = "gpt-4o-mini";
const NAMESPACE = "worksheet_studio_v1";

const ReferenceSchema = z.object({
  id: z.string(),
  filename: z.string(),
  kind: z.enum(["pdf", "docx", "image", "svg"]),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  pageCount: z.number().int().optional(),
  imageCount: z.number().int().optional(),
  textSnippet: z.string().max(500).optional(),
  layoutHints: z.array(z.string()).optional(),
}).passthrough();

const BodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  classLevel: z.enum(["nursery", "lkg", "ukg", "grade1", "grade2"]),
  subject: z.enum(["english", "math", "evs", "hindi", "gk", "phonics", "drawing"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  pageCount: z.number().int().min(1).max(4),
  answerKey: z.boolean().optional(),
  enhancedPrompt: z.string().max(4000).optional(),
  imageMode: z.enum(["same_style", "similar_style", "ignore_images", "images_only"]).optional(),
  language: z.enum(["english", "hindi", "bilingual"]).optional(),
  references: z.array(ReferenceSchema).max(10).optional(),
});

const EnhanceSchema = z.object({
  prompt: z.string().min(1).max(2000),
  classLevel: z.enum(["nursery", "lkg", "ukg", "grade1", "grade2"]),
  subject: z.enum(["english", "math", "evs", "hindi", "gk", "phonics", "drawing"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  pageCount: z.number().int().min(1).max(4),
  language: z.enum(["english", "hindi", "bilingual"]).optional(),
  references: z.array(ReferenceSchema).max(10).optional(),
});

router.post(
  "/worksheet-studio/generate",
  hubModuleGate("hub_worksheets"),
  aiUsageGate,
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const reqBody = parsed.data as WorksheetGenerateRequest;
    const fallback = buildFallbackDocument(reqBody);

    const openAiPayload: OpenAiChatPayload = {
      namespace: `${NAMESPACE}:${reqBody.classLevel}:${reqBody.subject}`,
      model: MODEL,
      json: true,
      max_completion_tokens: 2000,
      temperature: 0.65,
      messages: [
        { role: "system", content: buildWorksheetAiSystemPrompt() },
        { role: "user", content: buildWorksheetAiUserPrompt(reqBody) },
      ],
    };

    await submitAiJobAndRespond({
      res,
      userId,
      type: "openai.chat_json",
      payload: openAiPayload,
      buildSyncBody: (result) => {
        const raw = (result as { content: string | null; timedOut?: boolean }).content;
        if (!raw || (result as { timedOut?: boolean }).timedOut) {
          return { document: fallback, source: "local" as const, usedFallback: true, qualityScore: scoreWorksheet(fallback).overall };
        }
        try {
          const json = JSON.parse(raw) as unknown;
          const document = parseAiWorksheetResponse(json, reqBody, fallback);
          const quality = scoreWorksheet(document).overall;
          return { document, source: "ai" as const, usedFallback: false, qualityScore: quality };
        } catch (err) {
          logger.warn(
            `worksheet-studio/generate parse failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          return { document: fallback, source: "local" as const, usedFallback: true, qualityScore: scoreWorksheet(fallback).overall };
        }
      },
      buildAsyncBody: (jobId) => ({
        jobId,
        status: "processing",
        pollUrl: `/api/ai/jobs/${jobId}`,
      }),
    });
  },
);

router.post(
  "/worksheet-studio/enhance-prompt",
  hubModuleGate("hub_worksheets"),
  aiUsageGate,
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = EnhanceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const reqBody = parsed.data as EnhancePromptRequest;
    const localEnhanced = enhancePromptLocal(reqBody);

    const openAiPayload: OpenAiChatPayload = {
      namespace: `${NAMESPACE}:enhance:${reqBody.classLevel}`,
      model: MODEL,
      json: true,
      max_completion_tokens: 1200,
      temperature: 0.55,
      messages: [
        { role: "system", content: buildEnhancePromptSystemPrompt() },
        { role: "user", content: buildEnhancePromptUserPayload(reqBody) },
      ],
    };

    await submitAiJobAndRespond({
      res,
      userId,
      type: "openai.chat_json",
      payload: openAiPayload,
      buildSyncBody: (result) => {
        const raw = (result as { content: string | null; timedOut?: boolean }).content;
        if (!raw || (result as { timedOut?: boolean }).timedOut) {
          return { enhancedPrompt: localEnhanced, source: "local" as const };
        }
        try {
          const json = JSON.parse(raw) as { enhancedPrompt?: string };
          if (json.enhancedPrompt?.trim()) {
            return { enhancedPrompt: json.enhancedPrompt.trim(), source: "ai" as const };
          }
        } catch (err) {
          logger.warn(`worksheet-studio/enhance-prompt failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        return { enhancedPrompt: localEnhanced, source: "local" as const };
      },
      buildAsyncBody: (jobId) => ({
        jobId,
        status: "processing",
        pollUrl: `/api/ai/jobs/${jobId}`,
      }),
    });
  },
);

const CopilotSchema = z.object({
  message: z.string().min(1).max(500),
  document: z.record(z.unknown()),
});

router.post(
  "/worksheet-studio/copilot",
  hubModuleGate("hub_worksheets"),
  aiUsageGate,
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = CopilotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const doc = parsed.data.document as unknown as WorksheetDocument;
    const fallback = parseCopilotCommand(parsed.data.message, doc);
    const openAiPayload: OpenAiChatPayload = {
      namespace: `worksheet_copilot_v1:${doc.id}`,
      model: MODEL,
      json: true,
      max_completion_tokens: 400,
      temperature: 0.4,
      messages: [
        { role: "system", content: buildCopilotAiSystemPrompt() },
        { role: "user", content: buildCopilotAiUserPrompt(parsed.data.message, doc) },
      ],
    };
    await submitAiJobAndRespond({
      res,
      userId,
      type: "openai.chat_json",
      payload: openAiPayload,
      buildSyncBody: (result) => {
        const raw = (result as { content: string | null }).content;
        if (!raw) return { result: fallback, source: "local" as const };
        try {
          return { result: parseCopilotAiResponse(JSON.parse(raw), fallback, doc), source: "ai" as const };
        } catch (err) {
          logger.warn(`worksheet-studio/copilot failed: ${err instanceof Error ? err.message : String(err)}`);
          return { result: fallback, source: "local" as const };
        }
      },
      buildAsyncBody: (jobId) => ({ jobId, status: "processing", pollUrl: `/api/ai/jobs/${jobId}` }),
    });
  },
);

const AnalyzeSchema = z.object({
  references: z.array(ReferenceSchema).min(1).max(10),
});

router.post(
  "/worksheet-studio/analyze-reference",
  hubModuleGate("hub_worksheets"),
  aiUsageGate,
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = AnalyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const refs = parsed.data.references as WorksheetReferenceContext[];
    const localAnalyses = analyzeReferences(refs, false);
    const merged = mergeReferenceAnalyses(localAnalyses);

    const openAiPayload: OpenAiChatPayload = {
      namespace: `${NAMESPACE}:vision`,
      model: MODEL,
      json: true,
      max_completion_tokens: 800,
      temperature: 0.35,
      messages: [
        { role: "system", content: buildVisionAnalysisSystemPrompt() },
        { role: "user", content: buildVisionAnalysisUserPayload(refs) },
      ],
    };

    await submitAiJobAndRespond({
      res,
      userId,
      type: "openai.chat_json",
      payload: openAiPayload,
      buildSyncBody: (result) => {
        const raw = (result as { content: string | null; timedOut?: boolean }).content;
        if (!raw || (result as { timedOut?: boolean }).timedOut) {
          return { analyses: localAnalyses, merged, source: "local" as const };
        }
        try {
          const json = JSON.parse(raw) as { analyses?: typeof localAnalyses };
          if (json.analyses?.length) {
            return { analyses: json.analyses, merged: mergeReferenceAnalyses(json.analyses), source: "ai" as const };
          }
        } catch (err) {
          logger.warn(`worksheet-studio/analyze-reference failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        return { analyses: localAnalyses, merged, source: "local" as const };
      },
      buildAsyncBody: (jobId) => ({ jobId, status: "processing", pollUrl: `/api/ai/jobs/${jobId}` }),
    });
  },
);

export default router;
