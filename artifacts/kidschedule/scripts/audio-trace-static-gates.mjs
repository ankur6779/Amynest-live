/** One-off static-map gate check (not device). Run: node scripts/audio-trace-static-gates.mjs */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const map = JSON.parse(readFileSync(join(root, "src/data/static-audio-map.json"), "utf8"));

function normalizeKey(text) {
  return (text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function lookup(text, mode) {
  const bucket = map[mode] ?? {};
  const key = normalizeKey(text);
  return bucket[key] ?? null;
}

function resolvePhonicsPhrase(letter) {
  const vowels = new Set(["a", "e", "i", "o", "u"]);
  const l = letter.toLowerCase();
  const examples = { a: "apple", b: "bat", c: "cat" };
  if (vowels.has(l)) return `${l} as in ${examples[l] ?? l}`;
  if (l === "c") return "k";
  return l;
}

function check(module, resolvedText, staticCatalogTexts, catalogId) {
  const lines = [];
  lines.push(`audioIdentity = undefined`);
  lines.push(`resolvedText = ${JSON.stringify(resolvedText)}`);
  lines.push(`staticCatalogTexts = ${JSON.stringify(staticCatalogTexts)}`);
  lines.push(`catalogId = ${JSON.stringify(catalogId ?? undefined)}`);
  const phrase = staticCatalogTexts?.[0] || resolvedText;
  let hit = null;
  for (const mode of ["phonics", "default"]) {
    const r = lookup(phrase, mode);
    lines.push(`lookupStaticAudioUrl(${mode}) = ${JSON.stringify(r)}`);
    if (r && !hit) hit = r;
  }
  lines.push(`lookupStaticAudioUrl = ${JSON.stringify(hit)}`);
  if (!hit) {
    console.log(`${module}\n${lines.join("\n")}\nSTOP\nlookupStaticAudioUrl null\n`);
    return;
  }
  console.log(`${module}\n${lines.join("\n")}\n(sync: map hit — playPreparedUrl/audioManager need device)\n`);
}

const abacus =
  "count with me from 1 to 5. tap each item as you say the number.";
check("Phonics A", resolvePhonicsPhrase("a"), ["a as in apple"], undefined);
check("Phonics C", resolvePhonicsPhrase("c"), [resolvePhonicsPhrase("c")], undefined);
check("Abacus", abacus, [abacus], undefined);
check("Speech Coach", "a as in apple", ["a as in apple"], undefined);
check("Spelling cat", "cat", ["cat"], undefined);
