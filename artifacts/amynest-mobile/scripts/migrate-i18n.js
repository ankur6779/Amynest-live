#!/usr/bin/env node
/**
 * migrate-i18n.js
 *
 * One-shot migration helper for the deferred files in check-i18n.js.
 * - Scans each deferred file with the audit's regex.
 * - Wraps each hit in t("…") (using a stable, file-derived key).
 * - Adds `import { useTranslation } from "react-i18next";` and
 *   `const { t } = useTranslation();` if missing.
 * - Writes the new keys to i18n/en.json (with the original English text
 *   as the value). hi.json and hinglish.json get the English value too,
 *   to be replaced by translate-i18n.js afterwards.
 *
 * Output: writes the list of newly-added keys (with English text) to
 *   /tmp/amynest-new-i18n-keys.json so the translator can pick them up.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const I18N_DIR = path.join(ROOT, "i18n");

const DEFERRED_FILES = [
  "app/audio-lessons.tsx",
  "app/babysitters.tsx",
  "app/behavior-history.tsx",
  "app/behavior.tsx",
  "app/children/[id].tsx",
  "app/children/new.tsx",
  "app/coach/premium.tsx",
  "app/games.tsx",
  "app/onboarding.tsx",
  "app/paywall.tsx",
  "app/progress.tsx",
  "app/ptm-prep.tsx",
  "app/recipes.tsx",
  "app/referrals.tsx",
  "app/rewards.tsx",
  "app/routines/generate.tsx",
  "app/routines/[id].tsx",
  "app/routines/premium.tsx",
  "app/sign-in.tsx",
  "app/sign-up.tsx",
  "app/(tabs)/coach.tsx",
  "app/(tabs)/hub.tsx",
  "app/(tabs)/index.tsx",
  "app/(tabs)/profile.tsx",
  "app/(tabs)/routines.tsx",
  "app/welcome.tsx",
  "components/ActionButtons.tsx",
  "components/AiMealGenerator.tsx",
  "components/AmazingFacts.tsx",
  "components/AppDataStatusBanner.tsx",
  "components/ArtCraftReels.tsx",
  "components/ChildCard.tsx",
  "components/CoachCard.tsx",
  "components/CoachProgressCard.tsx",
  "components/ColoringBooks.tsx",
  "components/CryInsight.tsx",
  "components/DailyPuzzle.tsx",
  "components/DailyStory.tsx",
  "components/DashboardHeader.tsx",
  "components/ErrorFallback.tsx",
  "components/event-prep-generator-sheet.tsx",
  "components/FunSheets.tsx",
  "components/HubDebugOverlay.tsx",
  "components/InfantHub.tsx",
  "components/infant/InfantHealthTab.tsx",
  "components/InsightCard.tsx",
  "components/LifeSkillsZone.tsx",
  "components/MobileRecipeCard.tsx",
  "components/NavDrawer.tsx",
  "components/NeonRingHero.tsx",
  "components/ParentCommandCenter.tsx",
  "components/ParentingArticles.tsx",
  "components/ParentTasks.tsx",
  "components/PhoneAuthFlow.tsx",
  "components/PhonicsTestCard.tsx",
  "components/PhonicsTestRunner.tsx",
  "components/PremiumSplash.tsx",
  "components/PrintableWorksheets.tsx",
  "components/ProfileLockScreen.tsx",
  "components/RoutineCarousel.tsx",
  "components/RoutineInlineMeals.tsx",
  "components/RoutineItemModal.tsx",
  "components/SkillsFocus.tsx",
  "components/SleepPredict.tsx",
  "components/SlideToComplete.tsx",
  "components/SmartMathTricks.tsx",
  "components/SmartMealSuggestions.tsx",
  "components/StoryPlayer.tsx",
  "components/SwipeableCard.tsx",
  "components/TiffinFeedbackPanel.tsx",
  "components/VoiceSettingsPanel.tsx",
  // Also the non-deferred file with 3 errors:
  "app/notifications-settings.tsx",
];

const TEXT_NODE_RE = />([^<>{}\n]{3,})</g;
const PROP_RE =
  /(\s(?:placeholder|accessibilityLabel|title|alt))\s*=\s*("([^"\n]{3,})")/g;
const HAS_ENGLISH_RE = /[A-Za-z]{3,}/;

function fileToNamespace(rel) {
  let p = rel.replace(/\.tsx$/, "");
  if (p.startsWith("app/")) {
    p = "screens." + p.slice(4);
  } else if (p.startsWith("components/")) {
    p = "components." + p.slice(11);
  }
  p = p.replace(/[\(\)\[\]]/g, "");
  p = p.replace(/\//g, "_");
  // CamelCase -> snake_case
  p = p.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  p = p.replace(/-/g, "_");
  return p;
}

function slugify(text) {
  let s = text.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "_");
  s = s.replace(/^_+|_+$/g, "");
  if (s.length === 0) s = "x";
  if (s.length > 40) s = s.slice(0, 40).replace(/_+$/, "");
  return s;
}

// Load existing en.json so we can reuse keys that already match
const en = JSON.parse(fs.readFileSync(path.join(I18N_DIR, "en.json"), "utf8"));
const hi = JSON.parse(fs.readFileSync(path.join(I18N_DIR, "hi.json"), "utf8"));
const hg = JSON.parse(
  fs.readFileSync(path.join(I18N_DIR, "hinglish.json"), "utf8")
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

const newKeys = {}; // { dottedKey: englishText } for newly added keys

function ensureKey(ns, text) {
  // Try common./nav reuse for very common strings — optional, keep simple:
  // fall back to namespaced unique keys
  const baseSlug = slugify(text);
  let slug = baseSlug;
  let key = `${ns}.${slug}`;
  let n = 2;
  while (true) {
    const existing = getDeep(en, key);
    if (existing === undefined) {
      setDeep(en, key, text);
      setDeep(hi, key, text);
      setDeep(hg, key, text);
      newKeys[key] = text;
      return key;
    }
    if (existing === text) return key;
    slug = `${baseSlug}_${n}`;
    key = `${ns}.${slug}`;
    n += 1;
  }
}

function ensureUseTranslation(content) {
  let changed = false;

  if (!/from\s+["']react-i18next["']/.test(content)) {
    // Insert import after the last existing import line
    const lines = content.split("\n");
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s.+from\s+["'][^"']+["'];?\s*$/.test(lines[i])) {
        lastImportIdx = i;
      }
    }
    const importLine = `import { useTranslation } from "react-i18next";`;
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    content = lines.join("\n");
    changed = true;
  }

  if (!/useTranslation\s*\(\s*\)/.test(content)) {
    // Insert `const { t } = useTranslation();` before the first `return (`
    // or `return <` line, using the same indentation.
    const lines = content.split("\n");
    let target = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*return\s*\(/.test(lines[i]) || /^\s*return\s*</.test(lines[i])) {
        target = i;
        break;
      }
    }
    if (target >= 0) {
      const indent = lines[target].match(/^(\s*)/)[1];
      lines.splice(target, 0, `${indent}const { t } = useTranslation();`);
      content = lines.join("\n");
      changed = true;
    }
  }

  return { content, changed };
}

function processFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn(`skip (missing): ${rel}`);
    return { rel, replaced: 0 };
  }
  let content = fs.readFileSync(abs, "utf8");
  let lines = content.split("\n");
  const ns = fileToNamespace(rel);

  // Track if we are inside an `i18n-ignore-start … end` block.
  let inIgnoreBlock = false;

  // Build edit list line-by-line.
  let totalReplaced = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";

    if (line.includes("i18n-ignore-start")) {
      inIgnoreBlock = true;
      continue;
    }
    if (line.includes("i18n-ignore-end")) {
      inIgnoreBlock = false;
      continue;
    }
    if (inIgnoreBlock) continue;
    if (line.includes("i18n-ok") || prevLine.includes("i18n-ok")) continue;

    // Skip pure comment lines
    if (/^\s*\/\//.test(line)) continue;

    // Find all matches in this line.
    const edits = []; // {start,end,replacement}
    let m;

    TEXT_NODE_RE.lastIndex = 0;
    while ((m = TEXT_NODE_RE.exec(line)) !== null) {
      const text = m[1].trim();
      if (!HAS_ENGLISH_RE.test(text)) continue;
      if (/^\{[^}]+\}$/.test(text)) continue;
      const key = ensureKey(ns, text);
      // Reproduce the inner exact substring including surrounding spaces.
      const inner = m[1];
      const innerStart = m.index + 1; // skip `>`
      const innerEnd = innerStart + inner.length;
      edits.push({
        start: innerStart,
        end: innerEnd,
        replacement: `{t("${key}")}`,
      });
    }

    PROP_RE.lastIndex = 0;
    while ((m = PROP_RE.exec(line)) !== null) {
      const text = m[3].trim();
      if (!HAS_ENGLISH_RE.test(text)) continue;
      const key = ensureKey(ns, text);
      // m[2] is the quoted "TEXT" segment; replace with {t("KEY")}
      const quoteStart = m.index + m[1].length + line.slice(m.index + m[1].length).indexOf(m[2]);
      const quoteEnd = quoteStart + m[2].length;
      edits.push({
        start: quoteStart,
        end: quoteEnd,
        replacement: `{t("${key}")}`,
      });
    }

    if (edits.length === 0) continue;

    // Drop overlapping edits (text-node and prop should never overlap, but be safe)
    edits.sort((a, b) => a.start - b.start);
    const filtered = [];
    let lastEnd = -1;
    for (const e of edits) {
      if (e.start < lastEnd) continue;
      filtered.push(e);
      lastEnd = e.end;
    }

    // Apply edits in reverse
    let newLine = line;
    for (let k = filtered.length - 1; k >= 0; k--) {
      const e = filtered[k];
      newLine = newLine.slice(0, e.start) + e.replacement + newLine.slice(e.end);
    }
    lines[i] = newLine;
    totalReplaced += filtered.length;
  }

  if (totalReplaced === 0) {
    return { rel, replaced: 0 };
  }

  let newContent = lines.join("\n");
  const ensured = ensureUseTranslation(newContent);
  newContent = ensured.content;

  fs.writeFileSync(abs, newContent, "utf8");
  return { rel, replaced: totalReplaced };
}

const results = [];
for (const rel of DEFERRED_FILES) {
  results.push(processFile(rel));
}

// Save updated locale files (English and stub HI/HG)
fs.writeFileSync(
  path.join(I18N_DIR, "en.json"),
  JSON.stringify(en, null, 2) + "\n"
);
fs.writeFileSync(
  path.join(I18N_DIR, "hi.json"),
  JSON.stringify(hi, null, 2) + "\n"
);
fs.writeFileSync(
  path.join(I18N_DIR, "hinglish.json"),
  JSON.stringify(hg, null, 2) + "\n"
);

fs.writeFileSync(
  "/tmp/amynest-new-i18n-keys.json",
  JSON.stringify(newKeys, null, 2)
);

const totalReplacements = results.reduce((s, r) => s + r.replaced, 0);
console.log(`✓ Migrated ${totalReplacements} string(s) across ${results.length} files.`);
console.log(`✓ Added ${Object.keys(newKeys).length} new key(s).`);
console.log(`✓ Wrote new keys to /tmp/amynest-new-i18n-keys.json`);
for (const r of results) {
  if (r.replaced > 0) console.log(`   ${r.replaced.toString().padStart(4)}  ${r.rel}`);
}
