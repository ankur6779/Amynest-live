/**
 * Phonics audio coverage audit — inventory vs manifest report.
 *
 *   pnpm phonics:audio:audit
 *   pnpm phonics:audio:audit -- --verbose
 *   pnpm phonics:audio:audit -- --verify-gcs
 */
import {
  printPhonicsAudioAuditReport,
  runPhonicsAudioAudit,
} from "./phonics-audio-coverage.js";

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose");
  const verifyGcs = process.argv.includes("--verify-gcs");
  const result = await runPhonicsAudioAudit({ verifyGcs });
  printPhonicsAudioAuditReport(result, { verbose });
  if (result.verdict === "FAIL") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
