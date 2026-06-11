/**
 * Build-time phonics audio certification gate.
 * Fails if any phonics asset lacks pre-generated GCS audio.
 *
 *   pnpm phonics:audio:certify
 *
 * Set PHONICS_AUDIO_SKIP_CERTIFY=1 to skip (local dev only).
 */
import {
  printPhonicsAudioAuditReport,
  runPhonicsAudioAudit,
} from "./phonics-audio-coverage.js";

async function main(): Promise<void> {
  if (process.env.PHONICS_AUDIO_SKIP_CERTIFY === "1") {
    console.log("[phonics:audio:certify] skipped (PHONICS_AUDIO_SKIP_CERTIFY=1)");
    return;
  }

  const verifyGcs = process.env.PHONICS_AUDIO_VERIFY_GCS === "1";
  const result = await runPhonicsAudioAudit({ verifyGcs });
  printPhonicsAudioAuditReport(result, { verbose: process.argv.includes("--verbose") });

  if (result.verdict !== "PASS") {
    console.error("\n[phonics:audio:certify] FAIL — 100% audio coverage required.");
    console.error("  pnpm phonics:audio:audit -- --verbose");
    console.error("  ELEVENLABS_API_KEY=... pnpm phonics:audio:generate-missing\n");
    process.exit(1);
  }

  console.log("[phonics:audio:certify] PASS — Audio Coverage 100%, Runtime TTS Required 0.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
