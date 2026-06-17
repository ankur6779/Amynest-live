import { createHash } from "node:crypto";
import { logger } from "../lib/logger.js";

const REALTIME_MODEL = process.env.SPEECH_COACH_V2_REALTIME_MODEL?.trim()
  || "gpt-realtime";

const REALTIME_VOICE = process.env.SPEECH_COACH_V2_VOICE?.trim() || "shimmer";

function openAiApiKey(): string {
  const key =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return key;
}

function openAiBaseUrl(): string {
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
}

/** Mint an ephemeral OpenAI Realtime client secret for browser WebRTC. */
export async function mintRealtimeClientSecret(input: {
  userId: string;
  instructions: string;
}): Promise<RealtimeClientSecretResult> {
  const apiKey = openAiApiKey();
  const baseUrl = openAiBaseUrl();

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

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    logger.error({ status: res.status, errText }, "speech_coach_v2_realtime_mint_failed");
    throw new Error(`Realtime client secret mint failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    value?: string;
    client_secret?: { value?: string; expires_at?: number };
    expires_at?: number;
  };

  const clientSecret = data.client_secret?.value ?? data.value;
  const expiresAt = data.client_secret?.expires_at ?? data.expires_at ?? Math.floor(Date.now() / 1000) + 60;

  if (!clientSecret) {
    throw new Error("Realtime client secret missing from OpenAI response");
  }

  return {
    clientSecret,
    expiresAt,
    model: REALTIME_MODEL,
    voice: REALTIME_VOICE,
  };
}

export function getRealtimeCallsUrl(): string {
  return `${openAiBaseUrl()}/v1/realtime/calls`;
}

export { REALTIME_MODEL, REALTIME_VOICE };
