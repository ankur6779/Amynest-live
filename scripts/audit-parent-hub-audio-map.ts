/**
 * Section-by-section Parent Hub static audio map audit.
 *
 *   pnpm --filter @workspace/scripts exec tsx ./audit-parent-hub-audio-map.ts
 */
import { normalizeStaticAudioKey } from "@workspace/static-audio";
import { getParentHubAudioTextsForStaticCatalog } from "../lib/parent-hub-speak/src/index.ts";
import { getParentingArticlesAudioTextsForStaticCatalog } from "../lib/parenting-articles/src/index.ts";
import { loadStaticAudioMap } from "./static-audio-paths.js";

const map = loadStaticAudioMap();

function has(text: string): boolean {
  const k = normalizeStaticAudioKey(text);
  return Boolean(map.default[k] || map.phonics[k]);
}

function section(name: string, lines: string[]) {
  const missing = lines.filter((t) => !has(t));
  return {
    section: name,
    total: lines.length,
    mapped: lines.length - missing.length,
    missing: missing.length,
    ...(missing.length > 0 ? { unmappedSample: missing.slice(0, 2) } : {}),
  };
}

const hub = getParentHubAudioTextsForStaticCatalog();
const articles = getParentingArticlesAudioTextsForStaticCatalog();

const report = [
  section("hub_facts_stories_puzzle_activity_age", hub),
  section("hub_articles", articles),
  section("puzzle_feedback", ["Correct! Well done!"]),
];

console.log(JSON.stringify(report, null, 2));

const totalMissing = report.reduce((n, r) => n + r.missing, 0);
if (totalMissing > 0) process.exit(1);
