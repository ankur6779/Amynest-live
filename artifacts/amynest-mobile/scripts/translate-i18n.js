#!/usr/bin/env node
/**
 * translate-i18n.js
 *
 * Translates the new i18n keys (output of migrate-i18n.js) into Hindi
 * and Hinglish using the Anthropic API via the Replit AI Integrations
 * proxy. Reads /tmp/amynest-new-keys.json (a flat dotted-key map of
 * { key: englishText }), translates each, and writes the result back
 * into i18n/hi.json and i18n/hinglish.json (preserving structure).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const I18N_DIR = path.join(ROOT, "i18n");

const PROVIDER = process.env.TRANSLATE_PROVIDER || "anthropic";
let BASE, KEY;
if (PROVIDER === "openai-direct") {
  BASE = "https://api.openai.com";
  KEY = process.env.OPENAI_API_KEY;
} else if (PROVIDER === "openai") {
  BASE = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
} else {
  BASE = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  KEY = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
}
if (!BASE || !KEY) {
  console.error(`Missing AI_INTEGRATIONS env vars for provider=${PROVIDER}`);
  process.exit(1);
}
console.log(`Using provider=${PROVIDER}`);

const newKeys = JSON.parse(
  fs.readFileSync("/tmp/amynest-new-keys.json", "utf8")
);

function getDeep(obj, dottedKey) {
  const parts = dottedKey.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

const _hiInit = JSON.parse(
  fs.readFileSync(path.join(I18N_DIR, "hi.json"), "utf8")
);
const _hgInit = JSON.parse(
  fs.readFileSync(path.join(I18N_DIR, "hinglish.json"), "utf8")
);
const entries = Object.entries(newKeys).filter(([k, v]) => {
  if (typeof v !== "string" || v.trim().length === 0) return false;
  const cur_hi = getDeep(_hiInit, k);
  const cur_hg = getDeep(_hgInit, k);
  // Already translated if EITHER locale differs from English. (Hinglish
  // legitimately stays the same as English for many brand-y strings.)
  if (cur_hi !== v || cur_hg !== v) return false;
  return true;
});
console.log(`Need to translate ${entries.length} keys.`);

const SYSTEM = `You translate UI strings for an Indian parenting mobile app called AmyNest (Amy is the AI brand name; never translate "Amy", "AmyNest", "AI", brand names, or product names like "Co-Parent", "Coach"). Keep the same tone, capitalization style, and any leading/trailing emoji or punctuation/whitespace exactly. Keep i18n placeholders like {{name}} or {name} verbatim. Do not add quotation marks. For Hinglish, use natural Roman-script Hindi mixed with English (the way urban Indian parents speak), keep most product nouns in English, and never use Devanagari. For Hindi, use Devanagari script with simple, conversational language a young parent would use; keep brand names and common app terms (button labels like "Save", proper nouns) in English when natural.`;

async function translateBatch(batch) {
  const userMsg = `Translate each English UI string into BOTH Hindi (Devanagari) and Hinglish (Roman). Return STRICT JSON with shape: {"results": [{"key": string, "hi": string, "hinglish": string}, ...]} in the same order, one entry per input. Do not include any other text.

Strings:
${JSON.stringify(
  batch.map(([k, v]) => ({ key: k, en: v })),
  null,
  2
)}`;
  let url, headers, body;
  if (PROVIDER === "openai" || PROVIDER === "openai-direct") {
    url = `${BASE.replace(/\/$/, "")}/v1/chat/completions`;
    headers = {
      "content-type": "application/json",
      authorization: `Bearer ${KEY}`,
    };
    body = JSON.stringify({
      model: PROVIDER === "openai-direct" ? "gpt-4o-mini" : "gpt-5",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
    });
  } else {
    url = `${BASE.replace(/\/$/, "")}/v1/messages`;
    headers = {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
    };
    body = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
  }
  const resp = await fetch(url, { method: "POST", headers, body });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${t.slice(0, 500)}`);
  }
  const data = await resp.json();
  const text =
    PROVIDER === "openai" || PROVIDER === "openai-direct"
      ? data.choices[0].message.content
      : data.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // be lenient — try to extract JSON object if model added prose
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Could not parse JSON from response");
    parsed = JSON.parse(m[0]);
  }
  return parsed.results;
}

function setDeep(obj, dottedKey, value) {
  const parts = dottedKey.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object" || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

(async () => {
  const hi = JSON.parse(fs.readFileSync(path.join(I18N_DIR, "hi.json"), "utf8"));
  const hg = JSON.parse(
    fs.readFileSync(path.join(I18N_DIR, "hinglish.json"), "utf8")
  );

  const BATCH = 30;
  const batches = [];
  for (let i = 0; i < entries.length; i += BATCH)
    batches.push(entries.slice(i, i + BATCH));
  console.log(`Sending ${batches.length} batches of up to ${BATCH}...`);

  let translated = 0;
  for (let bi = 0; bi < batches.length; bi++) {
    let attempts = 0;
    let results;
    while (attempts < 4) {
      try {
        results = await translateBatch(batches[bi]);
        break;
      } catch (err) {
        attempts++;
        console.log(
          `  batch ${bi + 1} attempt ${attempts} failed: ${err.message}`
        );
        if (attempts >= 4) throw err;
        await new Promise((r) => setTimeout(r, 1500 * attempts));
      }
    }
    const wantedKeys = new Set(batches[bi].map(([k]) => k));
    let n = 0;
    for (const r of results) {
      if (!r || !r.key || !wantedKeys.has(r.key)) continue;
      if (typeof r.hi === "string") setDeep(hi, r.key, r.hi);
      if (typeof r.hinglish === "string") setDeep(hg, r.key, r.hinglish);
      n++;
    }
    translated += n;
    console.log(
      `  batch ${bi + 1}/${batches.length} ok (${n}/${batches[bi].length})  total=${translated}`
    );

    // Flush after every batch — bash tool kills the process aggressively
    fs.writeFileSync(
      path.join(I18N_DIR, "hi.json"),
      JSON.stringify(hi, null, 2) + "\n"
    );
    fs.writeFileSync(
      path.join(I18N_DIR, "hinglish.json"),
      JSON.stringify(hg, null, 2) + "\n"
    );
  }

  console.log(`✓ Translated ${translated} key(s) into hi/hinglish.`);
})().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
