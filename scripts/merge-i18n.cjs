#!/usr/bin/env node
/* eslint-disable */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KS = path.join(ROOT, 'artifacts/kidschedule');
const TRANS = JSON.parse(fs.readFileSync(path.join(KS, 'scripts/.i18n-codemod-translations.json'), 'utf8'));

function setDeep(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); }

const enPath = path.join(KS, 'src/i18n/en.json');
const hiPath = path.join(KS, 'src/i18n/hi.json');
const hgPath = path.join(KS, 'src/i18n/hinglish.json');

const en = loadJson(enPath);
const hi = loadJson(hiPath);
const hg = loadJson(hgPath);

let added = 0;
for (const e of TRANS) {
  const fullKey = `${e.ns}.${e.key}`;
  setDeep(en, fullKey, e.en);
  setDeep(hi, fullKey, e.hi);
  setDeep(hg, fullKey, e.hinglish);
  added++;
}

saveJson(enPath, en);
saveJson(hiPath, hi);
saveJson(hgPath, hg);
console.log(`merged ${added} translations`);
