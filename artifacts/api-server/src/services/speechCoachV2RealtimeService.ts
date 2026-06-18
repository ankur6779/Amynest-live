import { createHash } from "node:crypto";
import { logger } from "../lib/logger.js";

/** GA production Realtime model — @see https://platform.openai.com/docs/guides/realtime */
export const PRODUCTION_REALTIME_MODEL_DEFAULT = "gpt-realtime";

const PREVIEW_MODEL_PATTERN = /realtime-preview/i;

const REALTIME_VOICE = process.env.SPEECH_COACH_V2_VOICE?.trim() || "shimmer";

/** Browser WebRTC SDP exchange must always target public OpenAI (not server proxy bases). */
export const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

function openAiApiKey(): string | null {
  return (
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim()
    || null
  );
}

function openAiMintBaseUrl(): string {
  return (
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim()
    || "https://api.openai.com"
  ).replace(/\/$/, "");
}

function safetyIdentifier(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 32);
}

/** Retired beta/preview Realtime slugs must never be sent to OpenAI. */
export function isRetiredPreviewRealtimeModel(model: string): boolean {
  return PREVIEW_MODEL_PATTERN.test(model.trim());
}

/**
 * Resolve the Realtime model from SPEECH_COACH_V2_REALTIME_MODEL.
 * Preview models are rejected and replaced with the GA default.
 */
export function resolveSpeechCoachV2RealtimeModel(envValue?: string): string {
  const raw = (envValue ?? process.env.SPEECH_COACH_V2_REALTIME_MODEL ?? "").trim();
  if (!raw) return PRODUCTION_REALTIME_MODEL_DEFAULT;
  if (isRetiredPreviewRealtimeModel(raw)) {
    logger.warn(
      {
        evt: "speech_coach_v2_realtime_preview_model_rejected",
        rejectedModel: raw,
        fallback: PRODUCTION_REALTIME_MODEL_DEFAULT,
      },
      "Rejected retired Realtime preview model; using GA default",
    );
    return PRODUCTION_REALTIME_MODEL_DEFAULT;
  }
  return raw;
}

let cachedResolvedModel: string | null = null;

export function getSpeechCoachV2RealtimeModel(): string {
  if (!cachedResolvedModel) {
    cachedResolvedModel = resolveSpeechCoachV2RealtimeModel();
  }
  return cachedResolvedModel;
}

/** @deprecated Prefer getSpeechCoachV2RealtimeModel() — resolved GA model. */
export const REALTIME_MODEL = getSpeechCoachV2RealtimeModel();

export interface RealtimeClientSecretResult {
  clientSecret: string;
  expiresAt: number;
  /** Model used for mint (always GA-resolved). */
  model: string;
  /** Raw SPEECH_COACH_V2_REALTIME_MODEL env, if set. */
  envModel: string | null;
  /** Model after preview rejection (before OpenAI session echo). */
  requestedModel: string;
  voice: string;
  sessionId?: string;
  callsUrl: string;
  mintResponse: Record<string, unknown>;
}

function redactMintResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const mintResponse = structuredClone(raw);
  if (typeof mintResponse.value === "string") {
    mintResponse.value = `${String(mintResponse.value).slice(0, 8)}…`;
  }
  if (
    mintResponse.client_secret
    && typeof mintResponse.client_secret === "object"
    && mintResponse.client_secret !== null
    && "value" in mintResponse.client_secret
  ) {
    const cs = mintResponse.client_secret as { value?: string };
    if (typeof cs.value === "string") cs.value = `${cs.value.slice(0, 8)}…`;
  }
  return mintResponse;
}

/** Mint an ephemeral OpenAI Realtime client secret for browser WebRTC. */
export async function mintRealtimeClientSecret(input: {
  userId: string;
  instructions: string;
}): Promise<RealtimeClientSecretResult> {
  const apiKey = openAiApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const baseUrl = openAiMintBaseUrl();
  const envModel = process.env.SPEECH_COACH_V2_REALTIME_MODEL?.trim() || null;
  const requestedModel = getSpeechCoachV2RealtimeModel();

  const body = {
    session: {
      type: "realtime",
      model: requestedModel,
      instructions: input.instructions,
      audio: {
        input: {
          transcription: {
            model: "gpt-4o-mini-transcribe",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          voice: REALTIME_VOICE,
        },
      },
    },
  };

  const res = await fetch(`${baseUrl}/v1/realtime/client_secrets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": safetyIdentifier(input.userId),
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text().catch(() => "");
  if (!res.ok) {
    logger.error(
      {
        status: res.status,
        statusText: res.statusText,
        requestedModel,
        envModel,
        body: rawText.slice(0, 800),
      },
      "speech_coach_v2_realtime_mint_failed",
    );
    throw new Error(`Realtime client secret mint failed: ${res.status} — ${rawText.slice(0, 200)}`);
  }

  let data: {
    value?: string;
    client_secret?: { value?: string; expires_at?: number };
    expires_at?: number;
    session?: { id?: string; model?: string; voice?: string };
  };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    throw new Error("Realtime client secret mint returned invalid JSON");
  }

  const clientSecret = data.client_secret?.value ?? data.value;
  const expiresAt =
    data.client_secret?.expires_at
    ?? data.expires_at
    ?? Math.floor(Date.now() / 1000) + 60;

  const sessionEchoModel = data.session?.model;
  const model = requestedModel;

  if (sessionEchoModel && sessionEchoModel !== requestedModel) {
    logger.info(
      {
        requestedModel,
        sessionEchoModel,
        envModel,
      },
      "speech_coach_v2_realtime_session_model_echo",
    );
  }

  if (!clientSecret) {
    logger.error(
      { keys: Object.keys(data), bodyPreview: rawText.slice(0, 400) },
      "speech_coach_v2_realtime_mint_missing_secret",
    );
    throw new Error("Realtime client secret missing from OpenAI response");
  }

  const mintResponse = redactMintResponse(JSON.parse(rawText) as Record<string, unknown>);

  logger.info(
    {
      status: res.status,
      envModel,
      requestedModel,
      sessionEchoModel,
      model,
      voice: REALTIME_VOICE,
      sessionId: data.session?.id,
      expiresAt,
      secretPrefix: clientSecret.slice(0, 8),
      mintResponse,
    },
    "speech_coach_v2_realtime_mint_ok",
  );

  return {
    clientSecret,
    expiresAt,
    model,
    envModel,
    requestedModel,
    voice: REALTIME_VOICE,
    sessionId: data.session?.id,
    callsUrl: getRealtimeCallsUrl(),
    mintResponse,
  };
}

/** Public OpenAI calls URL for browser WebRTC — never derived from integration proxy bases. */
export function getRealtimeCallsUrl(): string {
  return OPENAI_REALTIME_CALLS_URL;
}

/** Boot probe: mint a ephemeral token to verify model + API access. */
export async function validateSpeechCoachV2RealtimeModelAtBoot(): Promise<void> {
  const envModel = process.env.SPEECH_COACH_V2_REALTIME_MODEL?.trim() || null;
  const model = getSpeechCoachV2RealtimeModel();

  if (!openAiApiKey()) {
    logger.warn(
      { evt: "REALTIME_MODEL_INVALID", model, envModel, reason: "OPENAI_API_KEY missing" },
      "REALTIME_MODEL_INVALID",
    );
    return;
  }

  try {
    const minted = await mintRealtimeClientSecret({
      userId: "boot-realtime-model-validation",
      instructions: "Reply with a single word: ok.",
    });
    logger.info(
      {
        evt: "REALTIME_MODEL_VALIDATED",
        model: minted.model,
        requestedModel: minted.requestedModel,
        envModel: minted.envModel,
        sessionId: minted.sessionId,
      },
      "REALTIME_MODEL_VALIDATED",
    );
  } catch (err) {
    logger.error(
      {
        evt: "REALTIME_MODEL_INVALID",
        model,
        envModel,
        message: err instanceof Error ? err.message : String(err),
      },
      "REALTIME_MODEL_INVALID",
    );
  }
}

export { REALTIME_VOICE };
