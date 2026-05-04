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
      newKeys[key] = text;
      return key;
    }
    if (existing === text) return key;
    slug = `${baseSlug}_${n}`;
    key = `${ns}.${slug}`;
    n += 1;
  }
}

// Match a `const { t, ... } = useTranslation();` line (with optional extras
// in the destructure). Used both to detect existing hook calls and to strip
// misplaced ones before re-inserting at the top of the component body.
// Capture group 1 is the FULL destructure (including braces) so we can
// preserve any extra members like `i18n` when hoisting.
const HOOK_LINE_RE =
  /^\s*const\s*(\{\s*t\b[^}]*\})\s*=\s*useTranslation\s*\(\s*\)\s*;?\s*$/;

// Component function declaration patterns. We restrict to PascalCase names so
// that helper functions like `formatRelative` / `slugify` are not mistaken
// for components.
const FUNC_DECL_RE =
  /^(\s*)(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*[<(]/;
const ARROW_DECL_RE =
  /^(\s*)(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*[:=]/;

/**
 * Locate every component function in `content` whose body contains a `t(`
 * call. Returns the line index that opens the body (the line ending in `{`),
 * the matching close-line, the indentation to use for inserting hooks, and
 * the component name.
 *
 * Top-level components are required to have their closing brace at the same
 * indentation as the declaration — true for every component file in this
 * codebase. Nested arrow components are intentionally ignored: we never want
 * to inject `useTranslation()` inside a callback.
 */
function findComponentBodies(content) {
  const lines = content.split("\n");
  const bodies = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const decl = line.match(FUNC_DECL_RE) || line.match(ARROW_DECL_RE);
    if (!decl) continue;

    const declIndent = decl[1] || "";

    // Walk forward to the line whose trimmed-end is `{`. That is the line
    // that opens the body. Bail out if we don't find one within a few lines
    // (defensive — keeps us from walking into the next declaration).
    let openLine = -1;
    for (let j = i; j < Math.min(i + 30, lines.length); j++) {
      const stripped = lines[j].replace(/\/\/.*$/, "").trimEnd();
      if (stripped.endsWith("{")) {
        openLine = j;
        break;
      }
    }
    if (openLine < 0) continue;

    // Closing brace at the declaration's indent.
    let closeLine = -1;
    for (let j = openLine + 1; j < lines.length; j++) {
      if (lines[j] === declIndent + "}" || lines[j].startsWith(declIndent + "} ")) {
        closeLine = j;
        break;
      }
    }
    if (closeLine < 0) continue;

    const bodySlice = lines.slice(openLine + 1, closeLine);
    if (!/\bt\s*\(/.test(bodySlice.join("\n"))) continue;

    bodies.push({
      name: decl[2],
      openLine,
      closeLine,
      bodyIndent: declIndent + "  ",
    });
  }

  return bodies;
}

function ensureUseTranslation(content) {
  let changed = false;

  // 1. Ensure the import exists.
  if (!/from\s+["']react-i18next["']/.test(content)) {
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

  // 2. For every component function whose body uses `t(`, ensure exactly
  //    one `const { t } = useTranslation();` lives at the very top of the
  //    body. Process bodies in reverse so earlier line indices remain valid.
  let lines = content.split("\n");
  const bodies = findComponentBodies(content).sort(
    (a, b) => b.openLine - a.openLine,
  );

  for (const body of bodies) {
    const bodyLines = lines.slice(body.openLine + 1, body.closeLine);

    // Collect existing hook bindings in this body, preserving each one's
    // destructure shape (so extra members like `i18n` survive a hoist).
    // Then strip them out — we'll re-add a single canonical line at the top.
    const destructures = [];
    const stripped = [];
    for (const l of bodyLines) {
      const m = l.match(HOOK_LINE_RE);
      if (m) {
        destructures.push(m[1]);
        continue;
      }
      stripped.push(l);
    }

    // Merge multiple destructures by union of identifiers (defensive — in
    // practice there is at most one per body). Falls back to `{ t }` when
    // the body had no existing hook call (the script's t() insertion just
    // added the first usage).
    let destructure = "{ t }";
    if (destructures.length > 0) {
      const ids = new Set();
      for (const d of destructures) {
        const inner = d.replace(/^\{\s*|\s*\}$/g, "");
        for (const part of inner.split(",")) {
          const id = part.trim();
          if (id) ids.add(id);
        }
      }
      // Keep `t` first for readability, then any extras in their original
      // first-seen order.
      const ordered = ["t", ...[...ids].filter((id) => id !== "t")];
      destructure = `{ ${ordered.join(", ")} }`;
    }

    const canonical = `${body.bodyIndent}const ${destructure} = useTranslation();`;
    stripped.unshift(canonical);

    // Determine whether any change is needed. The body is already correct iff
    // the original first line was the canonical hook call (same destructure)
    // and no other duplicates existed below it.
    const wasAlreadyCorrect =
      destructures.length === 1 &&
      bodyLines.length > 0 &&
      bodyLines[0] === canonical;

    if (!wasAlreadyCorrect) {
      lines.splice(
        body.openLine + 1,
        body.closeLine - body.openLine - 1,
        ...stripped,
      );
      changed = true;
    }
  }

  return { content: lines.join("\n"), changed };
}

/**
 * Post-write guard. Returns an array of human-readable issue strings — one
 * per misplaced `useTranslation()` call. Empty array means the file is safe.
 *
 * A call is considered misplaced if it appears inside any of:
 *  - a non-component function body (camelCase / lowercase name)
 *  - a nested arrow callback (`=> {`) inside a component
 *  - after a `return ` statement at the same or shallower indent as the call
 *  - inside an `if (...) {` / `} else {` branch (deeper indent than the
 *    enclosing component body)
 */
function validateHookPlacement(content) {
  const issues = [];
  const lines = content.split("\n");

  // Pre-compute which line ranges belong to component bodies (via the same
  // detector ensureUseTranslation uses) so we can recognise "outside any
  // component" vs "inside component but at wrong depth".
  const bodies = findComponentBodies(content);

  for (let i = 0; i < lines.length; i++) {
    if (!HOOK_LINE_RE.test(lines[i])) continue;
    const callIndent = lines[i].match(/^(\s*)/)[1];

    const owner = bodies.find(
      (b) => i > b.openLine && i < b.closeLine,
    );

    if (!owner) {
      issues.push(
        `line ${i + 1}: useTranslation() call is not inside a recognised component function body`,
      );
      continue;
    }

    if (callIndent !== owner.bodyIndent) {
      issues.push(
        `line ${i + 1}: useTranslation() in component "${owner.name}" is at indent ${callIndent.length}, expected ${owner.bodyIndent.length} (likely inside an if/else branch or nested callback)`,
      );
      continue;
    }

    // Reject if any earlier body line at the same indent contains a `return`
    // statement. That means the hook would only run on some renders.
    for (let j = owner.openLine + 1; j < i; j++) {
      const prev = lines[j];
      const prevIndent = prev.match(/^(\s*)/)[1];
      if (prevIndent.length > owner.bodyIndent.length) continue;
      // Allow blank lines, comments, imports, other hooks, declarations.
      if (/^\s*return\b/.test(prev)) {
        issues.push(
          `line ${i + 1}: useTranslation() in component "${owner.name}" appears AFTER an earlier \`return\` on line ${j + 1} — this violates the Rules of Hooks`,
        );
        break;
      }
      // An `if (...) ... return` on a single line is also an early return.
      if (/^\s*if\s*\(.+\)\s*return\b/.test(prev)) {
        issues.push(
          `line ${i + 1}: useTranslation() in component "${owner.name}" appears AFTER an early-return guard on line ${j + 1}`,
        );
        break;
      }
    }
  }

  return issues;
}

module.exports = {
  ensureUseTranslation,
  validateHookPlacement,
  findComponentBodies,
};

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

  // Pre-write guard: refuse to write if the resulting file would have a
  // misplaced useTranslation() call (after an early return, inside an
  // if-branch, or inside a nested callback). This is the source-of-truth
  // protection requested by Task #252.
  const issues = validateHookPlacement(newContent);
  if (issues.length > 0) {
    console.error(
      `\n❌ Refusing to write ${rel} — useTranslation() would be placed in a hooks-order-unsafe location:`,
    );
    for (const msg of issues) console.error(`     ${msg}`);
    console.error(
      `   Hoist the hook call to the very top of the component body manually, then re-run.`,
    );
    throw new Error(`hooks-order placement violation in ${rel}`);
  }

  fs.writeFileSync(abs, newContent, "utf8");
  return { rel, replaced: totalReplaced };
}

if (require.main === module) {
  const results = [];
  for (const rel of DEFERRED_FILES) {
    results.push(processFile(rel));
  }

  // Save updated locale file (English only)
  fs.writeFileSync(
    path.join(I18N_DIR, "en.json"),
    JSON.stringify(en, null, 2) + "\n"
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
}
