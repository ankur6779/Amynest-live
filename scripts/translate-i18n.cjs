#!/usr/bin/env node
/* eslint-disable */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KS = path.join(ROOT, 'artifacts/kidschedule');
const ADD_FILE = path.join(KS, 'scripts/.i18n-codemod-additions.json');
const OUT_FILE = path.join(KS, 'scripts/.i18n-codemod-translations.json');

const additions = JSON.parse(fs.readFileSync(ADD_FILE, 'utf8'));
const entries = [];
for (const [ns, kv] of Object.entries(additions)) {
  for (const [k, v] of Object.entries(kv)) entries.push({ ns, key: k, en: v });
}
console.log('total entries:', entries.length);

const BASE = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
if (!BASE || !KEY) { console.error('missing env'); process.exit(1); }

const SYSTEM = `You are a translator for a parenting app called AmyNest AI (also referred to as "Amy" or "KidSchedule"). You translate UI strings to two target languages:

1. **hi** — Hindi (Devanagari script). Natural conversational Hindi for Indian parents. Keep brand names ("Amy", "AmyNest", "AmyNest AI", "KidSchedule") in Latin script. Keep emojis, numbers, punctuation. Common English UI loanwords (login, profile, dashboard, premium, plan, password, OTP, AI, app, save, share) MAY be transliterated in Devanagari (e.g. "लॉगिन", "प्रोफाइल"). Preserve trailing/leading whitespace, punctuation marks (·, …, !, etc.), HTML/markdown markers, and any \\n or {variables}.

2. **hinglish** — Roman-script Hindi-English mix as commonly typed by urban Indian parents. Use Latin script. Examples: "Save karein", "Aaj ka routine", "Bachhe", "Yahan dekhein". Keep brand names as-is. Keep emojis/numbers/punctuation. Preserve whitespace and {variables}.

Translate the MEANING faithfully and concisely. Do not add new words or explanations. If the source is just a brand/proper noun (e.g. "Amy AI", "AmyNest"), keep it identical in both languages. If the source is a single emoji or pure punctuation, keep it identical.

Output STRICT JSON: {"items":[{"hi":"...","hinglish":"..."}, ...]} with the same length and order as input.`;

async function callOpenAI(messages) {
  const resp = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-5.4', messages, response_format: { type: 'json_object' } }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  return data.choices[0].message.content;
}

async function translateBatch(batch) {
  const userMsg = `Translate these ${batch.length} UI strings.\n\n` +
    JSON.stringify(batch.map((e, i) => ({ i, en: e.en })));
  const txt = await callOpenAI([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userMsg },
  ]);
  const parsed = JSON.parse(txt);
  let arr = null;
  if (Array.isArray(parsed)) arr = parsed;
  else if (Array.isArray(parsed.items)) arr = parsed.items;
  else for (const v of Object.values(parsed)) if (Array.isArray(v)) { arr = v; break; }
  if (!arr) throw new Error('no array: ' + txt.slice(0, 200));
  return arr;
}

const BATCH = 40;
const CONCURRENCY = 6;

// Resume support: if OUT_FILE exists, reuse what's there
let results = new Array(entries.length);
if (fs.existsSync(OUT_FILE)) {
  const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  if (Array.isArray(prev) && prev.length === entries.length) {
    for (let i = 0; i < prev.length; i++) {
      if (prev[i] && prev[i].hi != null && prev[i].hinglish != null) results[i] = prev[i];
    }
  }
}

async function processBatch(start) {
  const batch = entries.slice(start, start + BATCH);
  // Skip if already filled
  if (batch.every((_, i) => results[start + i])) return;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const out = await translateBatch(batch);
      if (out.length !== batch.length) throw new Error(`len ${out.length} vs ${batch.length}`);
      for (let i = 0; i < batch.length; i++) {
        results[start + i] = { ...batch[i], hi: String(out[i].hi ?? batch[i].en), hinglish: String(out[i].hinglish ?? batch[i].en) };
      }
      return;
    } catch (e) {
      console.error(`batch ${start} attempt ${attempt} err: ${e.message}`);
      if (attempt === 3) {
        // Fallback: copy English
        for (let i = 0; i < batch.length; i++) {
          results[start + i] = { ...batch[i], hi: batch[i].en, hinglish: batch[i].en };
        }
        return;
      }
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

(async () => {
  const starts = [];
  for (let i = 0; i < entries.length; i += BATCH) starts.push(i);
  console.log('batches:', starts.length, 'concurrency:', CONCURRENCY);

  let done = 0;
  const queue = starts.slice();
  let lastSave = Date.now();
  async function worker() {
    while (queue.length) {
      const s = queue.shift();
      await processBatch(s);
      done++;
      if (done % 4 === 0) console.log(`progress: ${done}/${starts.length}`);
      if (Date.now() - lastSave > 10000) {
        fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
        lastSave = Date.now();
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
  const missing = results.filter(r => !r).length;
  console.log(`done. missing: ${missing}`);
})();
