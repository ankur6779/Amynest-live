/**
 * Standalone OpenAI Realtime infra validator — no API server / DB required.
 * Usage: OPENAI_API_KEY=sk-... tsx scripts/validate-openai-realtime-infra.ts
 */
import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenvConfig({ path: path.join(repoRoot, ".env"), quiet: true });
dotenvConfig({ path: path.join(repoRoot, ".env.development"), override: true, quiet: true });
dotenvConfig({ path: path.join(repoRoot, ".env.local"), override: true, quiet: true });

const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim()
  || process.env.OPENAI_API_KEY?.trim()
  || "";

const baseUrl = (
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim()
  || "https://api.openai.com"
).replace(/\/$/, "");

import { SPEECH_COACH_V2_VAD_LISTENING } from "@workspace/speech-coach-v2";
import { resolveSpeechCoachV2RealtimeModel } from "../artifacts/api-server/src/services/speechCoachV2RealtimeService.js";

const model = resolveSpeechCoachV2RealtimeModel(process.env.SPEECH_COACH_V2_REALTIME_MODEL);
const voice = process.env.SPEECH_COACH_V2_VOICE?.trim() || "shimmer";

async function main() {
  console.log("=== OpenAI Realtime Infra Validation ===\n");
  console.log("OPENAI_API_KEY:", apiKey ? `set (${apiKey.slice(0, 7)}…)` : "MISSING");

  if (!apiKey) {
    console.error("\nFAIL: OPENAI_API_KEY not configured");
    process.exit(1);
  }

  let openaiReachable = false;
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12_000),
    });
    openaiReachable = res.ok;
    console.log("\nOpenAI /v1/models:", res.status, openaiReachable ? "OK" : "FAIL");
    if (!openaiReachable) {
      console.log("Body:", (await res.text()).slice(0, 300));
    }
  } catch (err) {
    console.error("\nOpenAI reachability FAIL:", err instanceof Error ? err.message : err);
  }

  let tokenMint = false;
  let mintResponse: unknown;
  try {
    const body = {
      session: {
        type: "realtime",
        model,
        instructions: "You are Amy. When the session starts, say exactly: Hello from Amy.",
        audio: {
          input: {
            transcription: { model: "gpt-4o-mini-transcribe" },
            noise_reduction: { type: "near_field" },
            turn_detection: { ...SPEECH_COACH_V2_VAD_LISTENING },
          },
          output: { voice },
        },
      },
    };

    const res = await fetch(`${baseUrl}/v1/realtime/client_secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    mintResponse = JSON.parse(text) as unknown;
    tokenMint = res.ok;
    console.log("\nRealtime token mint:", res.status, tokenMint ? "OK" : "FAIL");
    console.log("Response:", JSON.stringify(mintResponse, null, 2).slice(0, 800));
  } catch (err) {
    console.error("\nToken mint FAIL:", err instanceof Error ? err.message : err);
  }

  const result = { openaiReachable, model, tokenMint };
  console.log("\n=== Result ===");
  console.log(JSON.stringify(result, null, 2));

  if (!openaiReachable || !tokenMint) {
    process.exit(1);
  }
}

void main();
