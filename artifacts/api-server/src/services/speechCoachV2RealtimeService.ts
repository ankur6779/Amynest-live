import { createHash } from "node:crypto";
import { logger } from "../lib/logger.js";

const REALTIME_MODEL = process.env.SPEECH_COACH_V2_REALTIME_MODEL?.trim()
  || "gpt-realtime";

const REALTIME_VOICE = process.env.SPEECH_COACH_V2_VOICE?.trim() || "shimmer";

/** Browser WebRTC SDP exchange must always target public OpenAI (not server proxy bases). */
export const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

function openAiApiKey(): string {
  const key =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return key;
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

export interface RealtimeClientSecretResult {
  clientSecret: string;
  expiresAt: number;
  model: string;
  voice: string;
  sessionId?: string;
  callsUrl: string;
  mintResponse: Record<string, unknown>;
}

/** Mint an ephemeral OpenAI Realtime client secret for browser WebRTC. */
export async function mintRealtimeClientSecret(input: {
  userId: string;
  instructions: string;
}): Promise<RealtimeClientSecretResult> {
  const apiKey = openAiApiKey();
  const baseUrl = openAiMintBaseUrl();

  const body = {
    session: {
      type: "realtime",
      model: REALTIME_MODEL,
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
      { status: res.status, statusText: res.statusText, body: rawText.slice(0, 800) },
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
  const resolvedModel = data.session?.model ?? REALTIME_MODEL;

  if (!clientSecret) {
    logger.error(
      { keys: Object.keys(data), bodyPreview: rawText.slice(0, 400) },
      "speech_coach_v2_realtime_mint_missing_secret",
    );
    throw new Error("Realtime client secret missing from OpenAI response");
  }

  const mintResponse = JSON.parse(rawText) as Record<string, unknown>;
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

  logger.info(
    {
      status: res.status,
      requestedModel: REALTIME_MODEL,
      resolvedModel,
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
    model: resolvedModel,
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

export { REALTIME_MODEL, REALTIME_VOICE };
