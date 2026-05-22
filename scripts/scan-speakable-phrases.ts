/**
 * Scan full speakable phrase corpus and write artifacts/kidschedule/src/data/speakable-phrase-corpus.json
 *
 *   pnpm --filter @workspace/scripts run scan-speakable-phrases
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectAllSpeakablePhrases } from "@workspace/static-audio";
import { REPO_ROOT } from "./static-audio-paths.js";

const OUT = resolve(REPO_ROOT, "artifacts/kidschedule/src/data/speakable-phrase-corpus.json");

const phrases = collectAllSpeakablePhrases();
writeFileSync(OUT, `${JSON.stringify(phrases, null, 2)}\n`, "utf8");

console.log(`[scan-speakable-phrases] wrote ${phrases.length} phrases → ${OUT}`);
