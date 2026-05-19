/**
 * Fail when the shipped static-audio map does not cover the full catalog.
 * Used in prebuild / CI — no ElevenLabs or GCS required.
 *
 *   pnpm run check:static-audio
 */
import { config } from "dotenv";
import { listCatalogMissingKeys, REPO_ROOT } from "./static-audio-paths.js";

config({ path: `${REPO_ROOT}/.env` });

const missing = listCatalogMissingKeys();

if (missing.length > 0) {
  console.error("Missing static audio:", missing);
  console.error(
    `\n${missing.length} catalog phrase(s) lack pre-generated audio.\n` +
      "Run: pnpm run generate:static-audio\n",
  );
  process.exit(1);
}

console.log("Static audio map: 100% catalog coverage.");
