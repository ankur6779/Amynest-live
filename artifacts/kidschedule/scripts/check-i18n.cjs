#!/usr/bin/env node
/**
 * check-i18n.cjs (kidschedule)
 *
 * Flags JSX text nodes inside src/components/** and src/pages/** that
 * are not wrapped in t(...) calls.
 *
 * A "user-facing JSX text node" is any string between `>` and `<`
 * (or inside common props like `placeholder=`, `aria-label=`,
 * `title=`, `alt=`) that contains at least 3 consecutive ASCII letters
 * and is not:
 *   - already inside a {t("…")} expression
 *   - on a line containing  // i18n-ok  or  {/ * i18n-ok * /}
 *   - inside an  // i18n-ignore-start … // i18n-ignore-end  block
 *   - in a file listed in DEFERRED_FILES (warned, not errored)
 *
 * Brand names ("Amy", "AmyNest", "AmyNest AI", "KidSchedule"),
 * version numbers, and math operators are short enough to fall under
 * the 3-letter floor or should carry an explicit `// i18n-ok` marker.
 *
 * Usage:
 *   node artifacts/kidschedule/scripts/check-i18n.cjs
 */

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC  = path.join(ROOT, "src");
const SCAN_DIRS = [path.join(SRC, "components"), path.join(SRC, "pages")];

// Files still being migrated. Warned, not errored. Each entry is an
// explicit, reviewable decision. Remove a file once its strings are
// fully wrapped in t(...) and the audit passes for that file.
const DEFERRED_FILES = new Set([
  // All previously-deferred files have been migrated. Add a path back here
  // only if you intentionally need to defer audit errors during a future
  // migration, with a tracked follow-up.
]);

// Historical record of fully-migrated files (kept for documentation only).
const _MIGRATED = new Set([
  "src/components/amazing-facts.tsx",
  "src/components/amy-fab.tsx",
  "src/components/amy-icon.tsx",
  "src/components/amy-mascot-logo.tsx",
  "src/components/art-craft-reels.tsx",
  "src/components/audio-play-button.tsx",
  "src/components/baby-sleep-assistant.tsx",
  "src/components/coloring-books.tsx",
  "src/components/cry-insight.tsx",
  "src/components/daily-kids-activity.tsx",
  "src/components/daily-puzzle.tsx",
  "src/components/daily-story-section.tsx",
  "src/components/daily-tips.tsx",
  "src/components/event-prep-generator.tsx",
  "src/components/fun-sheets.tsx",
  "src/components/games/CardFlip.tsx",
  "src/components/games/FindMistake.tsx",
  "src/components/games/HiddenObjects.tsx",
  "src/components/games/OddOneOut.tsx",
  "src/components/games/PatternMatch.tsx",
  "src/components/games/SequenceMemory.tsx",
  "src/components/games/SpotTheDifference.tsx",
  "src/components/games/TargetTap.tsx",
  "src/components/infant-baby-cues.tsx",
  "src/components/infant-hub.tsx",
  "src/components/infant-milestones.tsx",
  "src/components/infant-mode.tsx",
  "src/components/infant-poems.tsx",
  "src/components/infant-sleep-module.tsx",
  "src/components/infant-sleep-tracker.tsx",
  "src/components/infant-sounds.tsx",
  "src/components/layout.tsx",
  "src/components/life-skills-zone.tsx",
  "src/components/MealRecipeCard.tsx",
  "src/components/notification-nudge-banner.tsx",
  "src/components/olympiad-zone.tsx",
  "src/components/parent-command-center.tsx",
  "src/components/parenting-articles.tsx",
  "src/components/paywall-modal.tsx",
  "src/components/phonics-learning.tsx",
  "src/components/printable-worksheets.tsx",
  "src/components/ptm-prep.tsx",
  "src/components/routine-inline-meals.tsx",
  "src/components/school-morning-flow-card.tsx",
  "src/components/sleep-predict.tsx",
  "src/components/smart-math-tricks.tsx",
  "src/components/smart-meal-suggestions.tsx",
  "src/components/spelling-mastery.tsx",
  "src/components/story-card.tsx",
  "src/components/story-carousel.tsx",
  "src/components/story-hub.tsx",
  "src/components/story-player.tsx",
  "src/components/tiffin-feedback-panel.tsx",
  "src/components/toddler-preschool-mode.tsx",
  "src/components/ui/alert.tsx",
  "src/components/ui/breadcrumb.tsx",
  "src/components/ui/button-group.tsx",
  "src/components/ui/carousel.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/empty.tsx",
  "src/components/ui/field.tsx",
  "src/components/ui/form.tsx",
  "src/components/ui/input-group.tsx",
  "src/components/ui/item.tsx",
  "src/components/ui/pagination.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/sidebar.tsx",
  "src/components/ui/spinner.tsx",
  "src/components/voice-settings.tsx",
  "src/pages/ai-coach.tsx",
  "src/pages/audio-lessons.tsx",
  "src/pages/babysitters/index.tsx",
  "src/pages/behavior/index.tsx",
  "src/pages/children/form.tsx",
  "src/pages/children/index.tsx",
  "src/pages/dashboard.tsx",
  "src/pages/delete-account.tsx",
  "src/pages/landing.tsx",
  "src/pages/notification-settings.tsx",
  "src/pages/parenting-hub.tsx",
  "src/pages/parent-profile.tsx",
  "src/pages/pricing.tsx",
  "src/pages/privacy.tsx",
  "src/pages/progress.tsx",
  "src/pages/recipes.tsx",
  "src/pages/referrals.tsx",
  "src/pages/routines/detail.tsx",
  "src/pages/routines/generate.tsx",
  "src/pages/routines/index.tsx",
  "src/pages/sign-in.tsx",
  "src/pages/sign-up.tsx",
  "src/pages/terms.tsx",
]);

function loadAllScannableFiles() {
  const out = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "__tests__") continue;
        walk(full);
      } else if (entry.isFile() && /\.tsx$/.test(entry.name)) {
        if (/\.test\.tsx$/.test(entry.name)) continue;
        out.push(full);
      }
    }
  }
  for (const d of SCAN_DIRS) walk(d);
  return out;
}

// Allow callers to OVERRIDE the deferred list by setting AUDIT_NO_DEFER=1.
const NO_DEFER = process.env.AUDIT_NO_DEFER === "1";

const TEXT_NODE_RE = />([^<>{}\n]{3,})</g;
const PROP_RE = /\s(?:placeholder|aria-label|title|alt)\s*=\s*"([^"\n]{3,})"/g;
// 3+ consecutive ASCII letters → looks like English
const HAS_ENGLISH_RE = /[A-Za-z]{3,}/;

// Patterns that indicate the captured snippet is JavaScript/TypeScript code
// matched between `>` and `<` rather than real JSX text. The naive regex
// above catches things like `>= 5 && hour <` or `=> Promise<void>` when a
// line contains comparison/ternary operators or TS generics.
const JS_CODE_PATTERNS = [
  /&&/, /\|\|/, /===/, /!==/, /=>/, /<=/, />=/,
  /\?\./, /\?\s*$/, /\?\s*\(/,
  /^\s*[=&,()!:;.|?]/,           // starts with an operator/punctuation
  /[=&|!?:(,]\s*$/,              // ends with an operator/punctuation
  /^\s*&[a-z]+;\s*$/,            // pure HTML entity like &nbsp;
  /\b(?:return|const|let|var|await|new|typeof|instanceof)\b/,
  /\.[A-Za-z_]\w*\s*[(<]/,       // member call/generic: foo.bar( or foo.Bar<
  /[A-Za-z_]\w*\s*:\s*[A-Z]/,    // TS type ann: name: SomeType
];

function looksLikeCode(text) {
  for (const re of JS_CODE_PATTERNS) {
    if (re.test(text)) return true;
  }
  return false;
}

function scanFile(filePath) {
  const rel       = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const isDeferred = !NO_DEFER && DEFERRED_FILES.has(rel);
  const lines     = fs.readFileSync(filePath, "utf8").split("\n");
  const findings  = [];

  let inIgnoreBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line     = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";

    if (line.includes("i18n-ignore-start")) { inIgnoreBlock = true;  continue; }
    if (line.includes("i18n-ignore-end"))   { inIgnoreBlock = false; continue; }
    if (inIgnoreBlock) continue;

    if (line.includes("i18n-ok") || prevLine.includes("i18n-ok")) continue;

    // Strip JS/TS comments so we don't pick up code comments.
    const stripped = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");

    let m;
    TEXT_NODE_RE.lastIndex = 0;
    while ((m = TEXT_NODE_RE.exec(stripped)) !== null) {
      const text = m[1].trim();
      if (!HAS_ENGLISH_RE.test(text)) continue;
      // Skip pure interpolation tokens like {value} (caught by regex `<` `>`)
      if (/^\{[^}]+\}$/.test(text)) continue;
      // Skip captures that look like JS/TS code rather than user-facing text.
      if (looksLikeCode(text)) continue;
      // The match index points to the opening `>`. Examine surrounding chars
      // to filter out TS arrow returns (`=> Promise<X>`) and TS generics
      // (`Foo<Bar>`) that look like JSX text but are pure code.
      const openIdx = m.index;
      const closeIdx = m.index + m[0].length - 1; // position of `<`
      const before = stripped.slice(Math.max(0, openIdx - 2), openIdx);
      const afterCh = stripped[closeIdx + 1] || "";
      // Preceded by `=`, `?`, `!`, or `:` (arrow / ternary / type) → code
      if (/[=?!:]$/.test(before)) continue;
      // Followed by `[A-Z]` (TS generic like `<Promise>`) or `/` (closing tag
      // like `</div>` would have triggered text node end but defensive)
      if (/[A-Z_]/.test(afterCh)) continue;
      findings.push({ lineNum: i + 1, snippet: text.slice(0, 80) });
    }

    PROP_RE.lastIndex = 0;
    while ((m = PROP_RE.exec(stripped)) !== null) {
      const text = m[1].trim();
      if (!HAS_ENGLISH_RE.test(text)) continue;
      if (looksLikeCode(text)) continue;
      findings.push({ lineNum: i + 1, snippet: `(prop) ${text.slice(0, 80)}` });
    }
  }

  return { rel, isDeferred, findings };
}

const files = loadAllScannableFiles();

const errors   = [];
const warnings = [];
for (const file of files) {
  const { rel, isDeferred, findings } = scanFile(file);
  if (findings.length === 0) continue;
  if (isDeferred) warnings.push({ rel, findings });
  else            errors.push({ rel, findings });
}

function printGroup(label, findings) {
  console.error(`\n  📄 ${label} (${findings.length} items)`);
  const shown = findings.slice(0, 20);
  for (const { lineNum, snippet } of shown) {
    console.error(`     Line ${String(lineNum).padStart(4)}:  ${snippet}`);
  }
  if (findings.length > shown.length) {
    console.error(`     … and ${findings.length - shown.length} more`);
  }
}

if (errors.length > 0) {
  const total = errors.reduce((n, f) => n + f.findings.length, 0);
  console.error(`❌  ${total} hardcoded English string(s) in audited files.`);
  console.error(`Wrap each in t("…") and add the key to src/i18n/{en,hi,hinglish}.json,`);
  console.error(`or add  // i18n-ok: <reason>  to the same line if intentional.\n`);
  for (const { rel, findings } of errors) printGroup(rel, findings);
}

if (warnings.length > 0) {
  const total = warnings.reduce((n, f) => n + f.findings.length, 0);
  console.error(`\n⚠️   ${total} hardcoded English string(s) in deferred files (warnings only).`);
  console.error(`Remove a file from DEFERRED_FILES in this script once it is fully migrated.\n`);
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("✅  No hardcoded English strings found in audited files.");
} else if (errors.length === 0) {
  console.log(`\n✅  No violations in audited files (${warnings.length} file(s) deferred).`);
}

process.exit(errors.length > 0 ? 1 : 0);
