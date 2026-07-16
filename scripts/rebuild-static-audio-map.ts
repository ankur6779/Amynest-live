/**
 * Rebuild static-audio-map.json keys from the speakable phrase corpus.
 * Uses canonical normalization for map keys; preserves content-addressed MP3 hashes.
 *
 *   pnpm --filter @workspace/scripts run rebuild-static-audio-map
 */
import { collectAllSpeakablePhrases, type StaticAudioMap } from "@workspace/static-audio";
import { writeStaticAudioMap } from "./static-audio-paths.js";

function publicUrl(hash: string): string {
  return `/api/static-audio/${hash}.mp3`;
}

function rebuildMap(): StaticAudioMap {
  const map: StaticAudioMap = { default: {}, phonics: {} };
  const records = collectAllSpeakablePhrases();

  for (const record of records) {
    const bucket = map[record.mode];
    const existing = bucket[record.normalizedKey];
    const url = publicUrl(record.hash);
    if (existing && existing !== url) {
      console.warn("[rebuild-static-audio-map] key collision", {
        key: record.normalizedKey.slice(0, 80),
        existing,
        incoming: url,
        source: record.source,
      });
    }
    bucket[record.normalizedKey] = url;
  }

  return map;
}

const map = rebuildMap();
writeStaticAudioMap(map);

console.log("[rebuild-static-audio-map] wrote", {
  default: Object.keys(map.default).length,
  phonics: Object.keys(map.phonics).length,
});
