/**
 * Verify every A–Z phonics letter resolves to a certified ElevenLabs library asset.
 *
 * Post-cutover (Phase G / Final Cleanup): phonics letters are served from the
 * ElevenLabs library manifest (`phonics-audio-map.json`), NOT the static-audio
 * "phonics" bucket (which was purged of legacy OpenAI clips). This check now
 * validates library coverage to match runtime `isPhonicsLibraryOnlyEnforced()`.
 *
 *   pnpm --filter @workspace/scripts run check-phonics-letter-static-map
 */
import { PHONICS_SOUNDS } from "@workspace/phonics-sounds";
import { loadPhonicsLibraryManifest } from "./phonics-library-io.js";

const manifest = loadPhonicsLibraryManifest();
const assets = manifest?.assets ?? {};
const missing: string[] = [];

for (const letter of Object.keys(PHONICS_SOUNDS).sort()) {
  const key = `letter:${letter.toLowerCase()}`;
  const asset = assets[key];
  if (!asset?.url?.startsWith("https://") || asset.source !== "elevenlabs") {
    missing.push(`${letter} → ${key}`);
  }
}

console.log("\n=== Phonics letter library coverage check ===\n");
console.log(`Letters tracked: ${Object.keys(PHONICS_SOUNDS).length}`);

if (missing.length === 0) {
  console.log("All phonics letters resolve to a certified ElevenLabs library asset.");
  process.exit(0);
}

console.error(`Missing ${missing.length} letter(s):\n`);
for (const m of missing) console.error(`  - ${m}`);
console.error("\nRun: pnpm --filter @workspace/scripts run generate-phonics-library\n");
process.exit(1);
