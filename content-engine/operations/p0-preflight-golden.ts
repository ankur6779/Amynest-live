import { createHash } from "node:crypto";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import { buildGoldenVoiceAndCaptions } from "./golden-voice.js";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";

const num = Number(process.argv[2] || 12);
const script = buildGoldenScript(allGoldenSeeds()[num - 1]!, num);
const { voiceScript, captions } = buildGoldenVoiceAndCaptions(script, 21);
const bibles: Record<string, { path: string; sha256: string }> = {};
for (const c of ["amy-ai", "amy-girl", "amy-boy"] as const) {
  const p = wardrobeFor(c).bibleAsset;
  if (!existsSync(p)) throw new Error(`Missing bible: ${c} ${p}`);
  bibles[c] = {
    path: p,
    sha256: createHash("sha256").update(readFileSync(p)).digest("hex"),
  };
}
if (/speak into the mic|shame flickers/i.test(voiceScript) && script.number !== 6) {
  throw new Error(`STOP: foreign Speech Practice narration on ${script.id}`);
}
const out = {
  id: script.id,
  topic: script.topic,
  featureName: script.featureName,
  category: script.category,
  voiceScript,
  captions: captions.map((c) => ({ start: c.start, end: c.end, text: c.text })),
  bibles,
};
const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, `../docs/operations/_preflight_${script.id}.json`);
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ok: true, id: out.id, topic: out.topic, feature: out.featureName, words: voiceScript.split(/\s+/).length, bibles: Object.fromEntries(Object.entries(bibles).map(([k, v]) => [k, v.sha256.slice(0, 16)])) }, null, 2));
