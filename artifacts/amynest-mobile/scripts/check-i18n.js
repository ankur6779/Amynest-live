#!/usr/bin/env node
/**
 * check-i18n.js (amynest-mobile)
 *
 * Flags <Text>...</Text> contents and common props (placeholder=,
 * accessibilityLabel=, title=) in app/, components/, and screens/
 * that are literal English strings instead of t(...) output.
 *
 * Suppression markers (mirrors the color audit):
 *   - // i18n-ok                          on the same OR previous line
 *   - // i18n-ignore-start … // i18n-ignore-end blocks
 *   - files listed in DEFERRED_FILES warn instead of erroring
 *
 * Brand strings, version numbers, and math operators should carry an
 * explicit `// i18n-ok` marker.
 */

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components", "screens"].map((d) => path.join(ROOT, d));

// Files still being migrated. Warned, not errored. Each entry is an
// explicit, reviewable decision. Remove a file once its strings are
// fully wrapped in t(...) and the audit passes for that file.
const DEFERRED_FILES = new Set([
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
]);

function loadAllScannableFiles() {
  const out = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        if (entry.name === "dev") continue;
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

const NO_DEFER = process.env.AUDIT_NO_DEFER === "1";

const TEXT_NODE_RE = />([^<>{}\n]{3,})</g;
const PROP_RE = /\s(?:placeholder|accessibilityLabel|title|alt)\s*=\s*"([^"\n]{3,})"/g;
const HAS_ENGLISH_RE = /[A-Za-z]{3,}/;

function scanFile(filePath) {
  const rel        = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const isDeferred = !NO_DEFER && DEFERRED_FILES.has(rel);
  const lines      = fs.readFileSync(filePath, "utf8").split("\n");
  const findings   = [];

  let inIgnoreBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line     = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";

    if (line.includes("i18n-ignore-start")) { inIgnoreBlock = true;  continue; }
    if (line.includes("i18n-ignore-end"))   { inIgnoreBlock = false; continue; }
    if (inIgnoreBlock) continue;

    if (line.includes("i18n-ok") || prevLine.includes("i18n-ok")) continue;

    const stripped = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");

    let m;
    TEXT_NODE_RE.lastIndex = 0;
    while ((m = TEXT_NODE_RE.exec(stripped)) !== null) {
      const text = m[1].trim();
      if (!HAS_ENGLISH_RE.test(text)) continue;
      if (/^\{[^}]+\}$/.test(text)) continue;
      findings.push({ lineNum: i + 1, snippet: text.slice(0, 80) });
    }

    PROP_RE.lastIndex = 0;
    while ((m = PROP_RE.exec(stripped)) !== null) {
      const text = m[1].trim();
      if (!HAS_ENGLISH_RE.test(text)) continue;
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
  console.error(`Wrap each in t("…") and add the key to i18n/{en,hi,hinglish}.json,`);
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
