#!/usr/bin/env node
/**
 * check-locale-parity.cjs
 *
 * Verifies that all locale JSON files present in each app share an identical
 * key set (deep, dotted-path comparison). Files that do not exist are skipped
 * so the check stays green when a locale has been intentionally removed.
 * Fails with a precise diff when keys diverge across present files.
 */

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const TARGETS = [
  {
    name   : "kidschedule",
    dir    : path.join(ROOT, "artifacts/kidschedule/src/i18n"),
    locales: ["en", "hi", "hinglish"],
  },
  {
    name   : "amynest-mobile",
    dir    : path.join(ROOT, "artifacts/amynest-mobile/i18n"),
    locales: ["en", "hi", "hinglish"],
  },
];

function flatten(obj, prefix = "", out = new Set()) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    out.add(prefix);
    return out;
  }
  for (const key of Object.keys(obj)) {
    flatten(obj[key], prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function loadKeys(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return flatten(json);
}

let hasErrors = false;

for (const { name, dir, locales } of TARGETS) {
  const present = locales
    .map((locale) => ({ locale, file: path.join(dir, `${locale}.json`) }))
    .filter(({ file }) => fs.existsSync(file));

  if (present.length === 0) {
    console.error(`❌  [${name}] No locale files found in ${dir}`);
    hasErrors = true;
    continue;
  }

  if (present.length === 1) {
    const { locale, file } = present[0];
    const keys = loadKeys(file);
    console.log(`✅  [${name}] Only ${locale}.json present — ${keys.size} keys (no parity check needed).`);
    continue;
  }

  const baseline = present[0];
  const baseKeys = loadKeys(baseline.file);

  let appHasErrors = false;
  for (const { locale, file } of present.slice(1)) {
    const set = loadKeys(file);
    const missing = [...baseKeys].filter((k) => !set.has(k));
    const extra   = [...set].filter((k) => !baseKeys.has(k));
    if (missing.length || extra.length) {
      appHasErrors = true;
      console.error(`\n❌  [${name}] ${locale}.json out of sync with ${baseline.locale}.json`);
      if (missing.length) {
        console.error(`   missing-in-${locale} (${missing.length}):`);
        for (const k of missing.slice(0, 25)) console.error(`     · ${k}`);
        if (missing.length > 25) console.error(`     … and ${missing.length - 25} more`);
      }
      if (extra.length) {
        console.error(`   extra-in-${locale} (${extra.length}):`);
        for (const k of extra.slice(0, 25)) console.error(`     · ${k}`);
        if (extra.length > 25) console.error(`     … and ${extra.length - 25} more`);
      }
    }
  }

  if (!appHasErrors) {
    const labels = present.map((p) => p.locale).join("/");
    console.log(`✅  [${name}] ${labels} locale files are in sync (${baseKeys.size} keys).`);
  } else {
    hasErrors = true;
  }
}

process.exit(hasErrors ? 1 : 0);
