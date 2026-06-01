/**
 * Verify every A–Z phonics letter resolves to a static-audio map entry (phonics bucket).
 *
 *   pnpm --filter @workspace/scripts run check-phonics-letter-static-map
 */
import { getPhonicsAudioText, PHONICS_SOUNDS } from "@workspace/phonics-sounds";
import { normalizeStaticAudioKey } from "@workspace/static-audio";
import { loadStaticAudioMap } from "./static-audio-paths.js";

const map = loadStaticAudioMap();
const missing: string[] = [];

for (const letter of Object.keys(PHONICS_SOUNDS).sort()) {
  const audioText = getPhonicsAudioText(letter);
  const key = normalizeStaticAudioKey(audioText);
  const url = map.phonics[key];
  if (!url?.startsWith("https://")) {
    missing.push(`${letter} → "${audioText}" (${key})`);
  }
}

console.log("\n=== Phonics letter static map check ===\n");
console.log(`Letters tracked: ${Object.keys(PHONICS_SOUNDS).length}`);

if (missing.length === 0) {
  console.log("All phonics letters resolve in static-audio map (phonics bucket).");
  process.exit(0);
}

console.error(`Missing ${missing.length} letter(s):\n`);
for (const m of missing) console.error(`  - ${m}`);
console.error("\nRun: pnpm run generate:static-audio\n");
process.exit(1);
