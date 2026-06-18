/**
 * Runtime verification for Speech Coach V2 OpenAI token mint (TEST 2 partial).
 * Usage: pnpm exec tsx scripts/verify-speech-coach-v2-mint.ts
 */
import { mintRealtimeClientSecret } from "../artifacts/api-server/src/services/speechCoachV2RealtimeService.js";

async function main() {
  const started = Date.now();
  console.info("[SC2_VERIFY] TOKEN_MINT_START", { ts: started });

  try {
    const result = await mintRealtimeClientSecret({
      userId: "verify-user",
      instructions:
        "You are Amy, a friendly speech coach for children. Greet the child warmly in one sentence.",
    });

    const tags = {
      TOKEN_MINTED: true,
      hasClientSecret: Boolean(result.clientSecret?.startsWith("ek_")),
      model: result.model,
      voice: result.voice,
      expiresAt: result.expiresAt,
      elapsedMs: Date.now() - started,
    };

    console.info("[SC2_VERIFY] TOKEN_MINTED", tags);

    if (!tags.hasClientSecret) {
      console.error("[SC2_VERIFY] FAIL missing client secret");
      process.exit(1);
    }

    console.info("[SC2_VERIFY] PASS server mint");
  } catch (err) {
    console.error("[SC2_VERIFY] TOKEN_MINT_FAILURE", {
      name: err instanceof Error ? err.name : "Error",
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - started,
    });
    process.exit(1);
  }
}

void main();
