/**
 * Worksheet AI generation with strict contract + retries.
 * Does not touch Fabric / LayoutTree / PDF / DOCX.
 */
import {
  buildFallbackDocument,
  buildWorksheetAiSchemaRepairPrompt,
  buildWorksheetAiSystemPrompt,
  buildWorksheetAiUserPrompt,
  getAiContractHealth,
  parseAiWorksheetContractOrThrow,
  recordAiContractAttempt,
  scoreWorksheet,
  storeRawAiResponse,
  validateAiWorksheetResponse,
  WORKSHEET_AI_OPENAI_JSON_SCHEMA,
  beginLivePipelineSession,
  endLivePipelineSession,
  type WorksheetDocument,
  type WorksheetGenerateRequest,
  type WorksheetGenerateResponse,
} from "@workspace/worksheet-studio";
import { chatCompletionWithTimeout, type ChatMessage } from "./openai-chat.js";
import { resolveOpenAiChatModel } from "./openai-model-catalog.js";
import { logger } from "../lib/logger.js";

const MAX_ATTEMPTS = 3; // 1 initial + 2 retries
const NAMESPACE = "worksheet_studio_contract_v1";

export type WorksheetAiGenerateJobResult = WorksheetGenerateResponse & {
  retryCount: number;
  attemptCount: number;
  schemaFailureCount: number;
  rawResponses: unknown[];
  fallbackReason?: string;
  health: ReturnType<typeof getAiContractHealth>;
};

function structuredResponseFormat() {
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "amynest_worksheet_v1",
      strict: true,
      schema: WORKSHEET_AI_OPENAI_JSON_SCHEMA as unknown as Record<string, unknown>,
    },
  };
}

function parseJsonContent(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { __parseError: true, raw: raw.slice(0, 500) };
  }
}

/**
 * Call OpenAI with structured JSON schema, validate with Zod, retry up to 2 times.
 * On total failure: local generator only — never return an invalid WorksheetDocument.
 */
export async function runWorksheetAiContractGeneration(
  reqBody: WorksheetGenerateRequest,
): Promise<WorksheetAiGenerateJobResult> {
  const responseId = `ws_contract_${Date.now()}`;
  const session = beginLivePipelineSession();
  const fallback = buildFallbackDocument(reqBody);
  const rawResponses: unknown[] = [];
  let schemaFailureCount = 0;
  let lastErrors: string[] = ["no response"];

  const messages: ChatMessage[] = [
    { role: "system", content: buildWorksheetAiSystemPrompt() },
    { role: "user", content: buildWorksheetAiUserPrompt(reqBody) },
  ];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      messages.push({
        role: "user",
        content: buildWorksheetAiSchemaRepairPrompt(lastErrors),
      });
    }

    const outcome = await chatCompletionWithTimeout(
      {
        model: resolveOpenAiChatModel("legacy"),
        messages,
        max_completion_tokens: 2500,
        temperature: attempt === 0 ? 0.55 : 0.2,
        response_format: structuredResponseFormat(),
      },
      45_000,
    );

    const json = parseJsonContent(outcome.content);
    rawResponses.push(structuredClone(json));
    storeRawAiResponse({ responseId, attempt, raw: json });
    session.captureRaw(json, {
      responseId: `${responseId}_a${attempt}`,
      model: resolveOpenAiChatModel("legacy"),
      pageCountHint: reqBody.pageCount,
    });

    if (outcome.timedOut || !outcome.content) {
      schemaFailureCount += 1;
      lastErrors = [outcome.timedOut ? "timed out" : outcome.error ?? "empty content"];
      logger.warn(
        { evt: "worksheet.ai_contract.empty", attempt, responseId, timedOut: outcome.timedOut },
        "Worksheet AI empty/timeout",
      );
      continue;
    }

    // Keep assistant turn for repair context
    messages.push({ role: "assistant", content: outcome.content });

    const validated = validateAiWorksheetResponse(json);
    if (!validated.ok) {
      schemaFailureCount += 1;
      lastErrors = validated.errors;
      logger.warn(
        {
          evt: "worksheet.ai_contract.schema_fail",
          attempt,
          responseId,
          errors: validated.errors.slice(0, 8),
        },
        "Worksheet AI schema validation failed",
      );
      continue;
    }

    try {
      const document = parseAiWorksheetContractOrThrow(validated.data, reqBody, fallback.id);
      const retryCount = attempt;
      recordAiContractAttempt({
        success: true,
        schemaFailure: schemaFailureCount > 0,
        usedRetry: retryCount > 0,
        retryCount,
        usedFallback: false,
      });
      const report = endLivePipelineSession();
      return {
        document,
        source: "ai",
        usedFallback: false,
        qualityScore: scoreWorksheet(document).overall,
        retryCount,
        attemptCount: attempt + 1,
        schemaFailureCount,
        rawResponses,
        health: getAiContractHealth(),
        pipelineAudit: report
          ? {
              rawApi: report.rawApi,
              stages: report.stages,
              diffs: report.diffs,
              firstCorruptionStage: report.firstCorruptionStage,
              mutationDetected: report.mutationDetected,
              logs: report.logs,
              report: {
                staticPath: report.staticPath,
                aiPath: report.aiPath,
                draftRestore: report.draftRestore,
                mutationDetected: report.mutationDetected,
                firstCorruptionStage: report.firstCorruptionStage,
              },
            }
          : undefined,
      };
    } catch (err) {
      schemaFailureCount += 1;
      lastErrors = [err instanceof Error ? err.message : String(err)];
      logger.warn(
        { evt: "worksheet.ai_contract.parse_fail", attempt, responseId, error: lastErrors[0] },
        "Worksheet AI contract parse failed",
      );
    }
  }

  // All attempts failed — local only
  recordAiContractAttempt({
    success: false,
    schemaFailure: true,
    usedRetry: schemaFailureCount > 1,
    retryCount: Math.max(0, MAX_ATTEMPTS - 1),
    usedFallback: true,
  });
  session.log(`AI contract failed after ${MAX_ATTEMPTS} attempts — local fallback`);
  session.firstCorruptionStage = session.firstCorruptionStage ?? "raw_api→parsed_document";
  session.mutationDetected = true;
  const report = endLivePipelineSession();

  logger.warn(
    {
      evt: "worksheet.ai_contract.fallback",
      responseId,
      schemaFailureCount,
      namespace: NAMESPACE,
      errors: lastErrors.slice(0, 6),
    },
    "Worksheet AI → local fallback",
  );

  return {
    document: fallback as WorksheetDocument,
    source: "local",
    usedFallback: true,
    qualityScore: scoreWorksheet(fallback).overall,
    retryCount: MAX_ATTEMPTS - 1,
    attemptCount: MAX_ATTEMPTS,
    schemaFailureCount,
    rawResponses,
    fallbackReason: lastErrors.join("; "),
    health: getAiContractHealth(),
    pipelineAudit: report
      ? {
          rawApi: report.rawApi,
          stages: report.stages,
          diffs: report.diffs,
          firstCorruptionStage: report.firstCorruptionStage,
          mutationDetected: report.mutationDetected,
          logs: report.logs,
          report: {
            staticPath: report.staticPath,
            aiPath: "FAIL",
            draftRestore: report.draftRestore,
            mutationDetected: true,
            firstCorruptionStage: report.firstCorruptionStage,
          },
        }
      : undefined,
  };
}
