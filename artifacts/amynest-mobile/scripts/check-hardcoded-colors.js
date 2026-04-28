#!/usr/bin/env node
/**
 * check-hardcoded-colors.js
 *
 * Scans all .ts/.tsx files under artifacts/amynest-mobile for hardcoded hex
 * color strings.  A "hardcoded" hex is any #RRGGBB or #RGB literal that is
 * NOT:
 *   - in the GLOBAL_ALLOWLIST  (#000, #fff, #FFF, #FFFFFF, #000000)
 *   - on a line that contains   // audit-ok  or  {/ * audit-ok * /}
 *   - on a line whose PREVIOUS line contains audit-ok
 *   - inside an  // audit-block-ignore-start … // audit-block-ignore-end  region
 *   - in a file listed in DEFERRED_FILES (those are warned, not errored)
 *
 * Files not yet fully audited are listed in DEFERRED_FILES below.
 * Once a file is fully clean, remove it from the list so it is enforced.
 *
 * Usage:
 *   node scripts/check-hardcoded-colors.js
 *
 * Exit codes:
 *   0  – no violations in audited files (deferred warnings do not count)
 *   1  – one or more violations found in audited files
 */

const fs   = require("fs");
const path = require("path");

// ─── Config ─────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");

/**
 * Files listed here are still being migrated.
 * They produce warnings but do not fail the build.
 * Remove a file from this list once its audit is complete.
 */
const DEFERRED_FILES = [
  // tabs
  "app/(tabs)/_layout.tsx",
  "app/(tabs)/hub.tsx",
  "app/(tabs)/profile.tsx",
  "app/(tabs)/routines.tsx",
  // app screens
  "app/amy-ai.tsx",
  "app/audio-lessons.tsx",
  "app/babysitters.tsx",
  "app/behavior.tsx",
  "app/behavior-history.tsx",
  "app/children/[id].tsx",
  "app/coach/premium.tsx",
  "app/coach/progress.tsx",
  "app/dev/theme.tsx",
  "app/event-prep.tsx",
  "app/games.tsx",
  "app/insights.tsx",
  "app/kids-control-center.tsx",
  "app/meals.tsx",
  "app/morning-flow.tsx",
  "app/notifications-settings.tsx",
  "app/nutrition.tsx",
  "app/olympiad.tsx",
  "app/onboarding.tsx",
  "app/paywall.tsx",
  "app/phonics-test.tsx",
  "app/privacy.tsx",
  "app/progress.tsx",
  "app/ptm-prep.tsx",
  "app/recipes.tsx",
  "app/referrals.tsx",
  "app/rewards.tsx",
  "app/routines/[id].tsx",
  "app/routines/generate.tsx",
  "app/routines/premium.tsx",
  "app/sign-in.tsx",
  "app/sign-up.tsx",
  "app/stories.tsx",
  "app/study.tsx",
  "app/tutorial.tsx",
  "app/welcome.tsx",
  // components
  "components/ActionButtons.tsx",
  "components/AiMealGenerator.test.tsx",
  "components/AiMealGenerator.tsx",
  "components/AmyAISuggests.tsx",
  "components/ArtCraftReels.tsx",
  "components/DashboardHeader.tsx",
  "components/DashboardTodaysActivities.test.tsx",
  "components/FuturePredictor.tsx",
  "components/HubDebugOverlay.tsx",
  "components/InfantHub.tsx",
  "components/LanguageRow.tsx",
  "components/LifeSkillsZone.tsx",
  "components/NeonRingHero.tsx",
  "components/ParentCommandCenter.tsx",
  "components/PhoneAuthFlow.tsx",
  "components/PhonicsTestCard.tsx",
  "components/PhonicsTestRunner.tsx",
  "components/PremiumBadge.tsx",
  "components/PremiumSplash.tsx",
  "components/PrintableWorksheets.tsx",
  "components/ProfileCard.tsx",
  "components/ProfileLockScreen.tsx",
  "components/RoutineCard.tsx",
  "components/RoutineCarousel.tsx",
  "components/RoutineInlineMeals.tsx",
  "components/RoutineItemModal.tsx",
  "components/SlideToComplete.tsx",
  "components/SmartMealSuggestions.tsx",
  "components/StoryCard.tsx",
  "components/StoryCarousel.tsx",
  "components/SwipeableCard.tsx",
  "components/TiffinFeedbackPanel.tsx",
  "components/TryFreeBadge.tsx",
  "components/event-prep-generator-sheet.tsx",
];

/**
 * Hex values that are globally allowed (pure black / pure white only).
 * These appear legitimately in gradients, shadows, and overlays everywhere.
 */
const GLOBAL_ALLOWLIST = new Set([
  "#000", "#000000",
  "#fff", "#FFF", "#FFFFFF", "#ffffff",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HEX_RE = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;

function scanFile(filePath) {
  const rel      = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const isDeferred = DEFERRED_FILES.some((d) => rel.endsWith(d) || rel === d);
  const lines    = fs.readFileSync(filePath, "utf8").split("\n");
  const findings = [];

  let inIgnoreBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line     = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";

    // Block-level suppression markers
    if (line.includes("audit-block-ignore-start")) { inIgnoreBlock = true;  continue; }
    if (line.includes("audit-block-ignore-end"))   { inIgnoreBlock = false; continue; }
    if (inIgnoreBlock) continue;

    // Line-level suppression: current line OR previous line contains audit-ok
    if (line.includes("audit-ok") || prevLine.includes("audit-ok")) continue;

    // Scan for hex literals
    let match;
    HEX_RE.lastIndex = 0;
    while ((match = HEX_RE.exec(line)) !== null) {
      const hex = match[0];
      if (GLOBAL_ALLOWLIST.has(hex)) continue;
      findings.push({ lineNum: i + 1, hex, snippet: line.trimEnd().slice(0, 100) });
    }
  }

  return { rel, isDeferred, findings };
}

function walkDir(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and hidden dirs
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walkDir(full, results);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const allFiles = walkDir(path.join(ROOT, "app"))
  .concat(walkDir(path.join(ROOT, "components")));

const errors   = [];
const warnings = [];

for (const file of allFiles) {
  const { rel, isDeferred, findings } = scanFile(file);
  if (findings.length === 0) continue;
  if (isDeferred) warnings.push({ rel, findings });
  else            errors.push({ rel, findings });
}

function printGroup(label, findings) {
  console.error(`\n  📄 ${label} (${findings.length} items)`);
  for (const { lineNum, hex, snippet } of findings) {
    console.error(`     Line ${String(lineNum).padStart(4)}: ${hex.padEnd(8)} →  ${snippet}`);
  }
}

if (errors.length > 0) {
  const totalErrors = errors.reduce((n, f) => n + f.findings.length, 0);
  console.error(`❌  ${totalErrors} hardcoded hex color(s) in audited files.`);
  console.error(`Replace each with a token from constants/colors.ts / useColors(), or`);
  console.error(`add  // audit-ok: <reason>  to the same line if intentional.\n`);
  for (const { rel, findings } of errors) printGroup(rel, findings);
}

if (warnings.length > 0) {
  const totalWarns = warnings.reduce((n, f) => n + f.findings.length, 0);
  console.error(`\n⚠️   ${totalWarns} hardcoded hex color(s) in deferred files (warnings only).`);
  console.error(`Remove a file from DEFERRED_FILES in this script once its audit is complete.\n`);
  for (const { rel, findings } of warnings) printGroup(rel, findings);
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("✅  No hardcoded hex colors found.");
}

process.exit(errors.length > 0 ? 1 : 0);
