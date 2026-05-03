#!/usr/bin/env node
/**
 * check-locale-parity.cjs
 *
 * Verifies that en.json, hi.json, and hinglish.json in both the
 * kidschedule and amynest-mobile apps have an identical key set
 * (deep, dotted-path comparison). Fails with a precise diff if any
 * keys are missing or extra.
 */

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const TARGETS = [
  {
    name: "kidschedule",
    dir : path.join(ROOT, "artifacts/kidschedule/src/i18n"),
  },
  {
    name: "amynest-mobile",
    dir : path.join(ROOT, "artifacts/amynest-mobile/i18n"),
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
for (const { name, dir } of TARGETS) {
  const en = loadKeys(path.join(dir, "en.json"));
  const hi = loadKeys(path.join(dir, "hi.json"));
  const hg = loadKeys(path.join(dir, "hinglish.json"));

  const checks = [
    ["hi", hi, "missing-in-hi", "extra-in-hi"],
    ["hinglish", hg, "missing-in-hinglish", "extra-in-hinglish"],
  ];

  let appHasErrors = false;
  for (const [label, set, missingLabel, extraLabel] of checks) {
    const missing = [...en].filter((k) => !set.has(k));
    const extra   = [...set].filter((k) => !en.has(k));
    if (missing.length || extra.length) {
      appHasErrors = true;
      console.error(`\n❌  [${name}] ${label}.json out of sync with en.json`);
      if (missing.length) {
        console.error(`   ${missingLabel} (${missing.length}):`);
        for (const k of missing.slice(0, 25)) console.error(`     · ${k}`);
        if (missing.length > 25) console.error(`     … and ${missing.length - 25} more`);
      }
      if (extra.length) {
        console.error(`   ${extraLabel} (${extra.length}):`);
        for (const k of extra.slice(0, 25)) console.error(`     · ${k}`);
        if (extra.length > 25) console.error(`     … and ${extra.length - 25} more`);
      }
    }
  }
  if (!appHasErrors) {
    console.log(`✅  [${name}] en/hi/hinglish locale files are in sync (${en.size} keys).`);
  } else {
    hasErrors = true;
  }
}

process.exit(hasErrors ? 1 : 0);
