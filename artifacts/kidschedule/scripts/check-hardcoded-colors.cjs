#!/usr/bin/env node
/**
 * check-hardcoded-colors.js (kidschedule)
 *
 * Mirrors the mobile color audit. Flags:
 *   (a) raw #RRGGBB / #RGB literals in src/**\/*.{ts,tsx} outside index.css,
 *       theme/token files, and brand SVG assets, and
 *   (b) raw Tailwind brand-palette utilities (text-/bg-/border-/from-/to-/
 *       via-/ring-/shadow- × violet|purple|pink|fuchsia|rose|red|orange|
 *       amber|emerald|green|blue|indigo|slate|gray-50..950) outside an
 *       allowlist.
 *
 * Suppression markers (same convention as the mobile script):
 *   - // audit-ok                       on the same OR previous line
 *   - {/ * audit-ok * /}                on the same OR previous line
 *   - // audit-block-ignore-start … // audit-block-ignore-end
 *
 * Files still being migrated live in DEFERRED_FILES — they produce
 * warnings but do not fail the build. Remove a file from the list once
 * its audit is complete.
 *
 * Exit codes:
 *   0 – no violations in audited files (deferred warnings do not count)
 *   1 – one or more violations found in audited files
 */

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC  = path.join(ROOT, "src");

// Files exempt entirely (theme/token sources, brand SVG assets).
const EXEMPT_FILES = new Set([
  "src/index.css",
]);

// Files still being migrated. Warned, not errored. Remove a file once clean.
const DEFERRED_FILES = [
  "src/components/abacus-zone.test.tsx",
  "src/components/abacus-zone.tsx",
  "src/components/age-based-sections.tsx",
  "src/components/amazing-facts.tsx",
  "src/components/amy-face-svg.tsx",
  "src/components/amy-fab.tsx",
  "src/components/amy-icon.tsx",
  "src/components/amy-mascot-logo.tsx",
  "src/components/art-craft-reels.tsx",
  "src/components/audio-play-button.tsx",
  "src/components/baby-sleep-assistant.tsx",
  "src/components/brand-logo.tsx",
  "src/components/coloring-books.tsx",
  "src/components/coming-next-wrapper.tsx",
  "src/components/cry-insight.tsx",
  "src/components/daily-kids-activity.tsx",
  "src/components/daily-puzzle.tsx",
  "src/components/daily-story-section.tsx",
  "src/components/daily-tips.tsx",
  "src/components/event-prep-card.tsx",
  "src/components/event-prep-generator.tsx",
  "src/components/fun-sheets.tsx",
  "src/components/future-predictor.tsx",
  "src/components/games/BehaviorChoice.tsx",
  "src/components/games/CardFlip.tsx",
  "src/components/games/ColorFill.tsx",
  "src/components/games/ColorMemory.tsx",
  "src/components/games/FindMistake.tsx",
  "src/components/games/HiddenObjects.tsx",
  "src/components/games/MazeEscape.tsx",
  "src/components/games/NumberMatch.tsx",
  "src/components/games/OddOneOut.tsx",
  "src/components/games/PatternMatch.tsx",
  "src/components/games/SequenceMemory.tsx",
  "src/components/games/ShapeMatching.tsx",
  "src/components/games/SpeedMath.tsx",
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
  "src/components/language-switcher.tsx",
  "src/components/layout.tsx",
  "src/components/life-skills-zone.tsx",
  "src/components/locked-block.tsx",
  "src/components/MealRecipeCard.tsx",
  "src/components/notification-nudge-banner.tsx",
  "src/components/olympiad-zone.tsx",
  "src/components/parent-command-center.test.tsx",
  "src/components/parent-command-center.tsx",
  "src/components/parenting-articles.tsx",
  "src/components/paywall-modal.tsx",
  "src/components/phone-auth-flow.tsx",
  "src/components/phonics-learning.tsx",
  "src/components/phonics-test.tsx",
  "src/components/premium-badge.tsx",
  "src/components/printable-worksheets.tsx",
  "src/components/ptm-prep.tsx",
  "src/components/react-instance-recovery.tsx",
  "src/components/routine-inline-meals.tsx",
  "src/components/school-morning-flow-card.tsx",
  "src/components/sleep-predict.tsx",
  "src/components/smart-math-tricks.tsx",
  "src/components/smart-meal-suggestions.tsx",
  "src/components/smart-study-zone.tsx",
  "src/components/spelling-mastery.tsx",
  "src/components/stage-milestones-card.tsx",
  "src/components/story-card.tsx",
  "src/components/story-hub.tsx",
  "src/components/story-player.tsx",
  "src/components/study-engagement.tsx",
  "src/components/sub-item-gate.tsx",
  "src/components/tiffin-feedback-panel.tsx",
  "src/components/toddler-preschool-mode.tsx",
  "src/components/ui/chart.tsx",
  "src/components/ui/toast.tsx",
  "src/components/voice-settings.tsx",
  "src/data/infant-poems.ts",
  "src/hooks/use-subscription.ts",
  "src/lib/age-groups.ts",
  "src/lib/nutrition-data.ts",
  "src/lib/parenting-tips-data.ts",
  "src/pages/ai-coach-progress.tsx",
  "src/pages/ai-coach.tsx",
  "src/pages/assistant.tsx",
  "src/pages/audio-lessons.tsx",
  "src/pages/behavior/index.tsx",
  "src/pages/children/form.tsx",
  "src/pages/children/index.tsx",
  "src/pages/dashboard.tsx",
  "src/pages/delete-account.tsx",
  "src/pages/event-prep.tsx",
  "src/pages/games.tsx",
  "src/pages/insights.tsx",
  "src/pages/kids-control-center.tsx",
  "src/pages/landing.tsx",
  "src/pages/notification-settings.tsx",
  "src/pages/notify-prompt.tsx",
  "src/pages/nutrition/index.tsx",
  "src/pages/onboarding.tsx",
  "src/pages/parenting-hub.tsx",
  "src/pages/pricing.tsx",
  "src/pages/privacy.tsx",
  "src/pages/progress.tsx",
  "src/pages/recipes.tsx",
  "src/pages/referrals.tsx",
  "src/pages/rewards.tsx",
  "src/pages/routines/detail.tsx",
  "src/pages/routines/generate.tsx",
  "src/pages/routines/index.tsx",
  "src/pages/school-morning-flow.tsx",
  "src/pages/sign-in.tsx",
  "src/pages/sign-up.tsx",
  "src/pages/study.tsx",
  "src/pages/terms.tsx",
];

const GLOBAL_ALLOWLIST = new Set([
  "#000", "#000000",
  "#fff", "#FFF", "#FFFFFF", "#ffffff",
]);

const HEX_RE = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;

const BRAND_FAMILIES = [
  "violet", "purple", "pink", "fuchsia", "rose", "red", "orange",
  "amber", "emerald", "green", "blue", "indigo", "slate", "gray",
];
const BRAND_PREFIXES = ["text", "bg", "border", "from", "to", "via", "ring", "shadow"];
// Match prefix-family-shade with optional opacity (e.g. /50) and optional
// variant prefix (hover:, dark:, etc.). Includes the leading word boundary.
const BRAND_UTIL_RE = new RegExp(
  String.raw`(?:^|[\s"'\` :>(])(?:[a-z-]+:)?(?:` +
  BRAND_PREFIXES.join("|") +
  String.raw`)-(?:` +
  BRAND_FAMILIES.join("|") +
  String.raw`)-(?:50|100|200|300|400|500|600|700|800|900|950)\b`,
  "g",
);

function scanFile(filePath) {
  const rel       = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (EXEMPT_FILES.has(rel)) return { rel, isDeferred: false, findings: [] };
  const isDeferred = DEFERRED_FILES.some((d) => rel === d || rel.endsWith(d));
  const lines     = fs.readFileSync(filePath, "utf8").split("\n");
  const findings  = [];

  let inIgnoreBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line     = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";

    if (line.includes("audit-block-ignore-start")) { inIgnoreBlock = true;  continue; }
    if (line.includes("audit-block-ignore-end"))   { inIgnoreBlock = false; continue; }
    if (inIgnoreBlock) continue;

    if (line.includes("audit-ok") || prevLine.includes("audit-ok")) continue;

    // Hex literals
    let m;
    HEX_RE.lastIndex = 0;
    while ((m = HEX_RE.exec(line)) !== null) {
      const hex = m[0];
      if (GLOBAL_ALLOWLIST.has(hex)) continue;
      const before = line.slice(0, m.index);
      if (/(?:^|\W)[Tt]ask\s+$/.test(before)) continue;
      findings.push({ lineNum: i + 1, kind: hex, snippet: line.trimEnd().slice(0, 100) });
    }

    // Brand-palette utility classes
    BRAND_UTIL_RE.lastIndex = 0;
    while ((m = BRAND_UTIL_RE.exec(line)) !== null) {
      const cls = m[0].trim().replace(/^["'` :>(]+/, "");
      findings.push({ lineNum: i + 1, kind: cls, snippet: line.trimEnd().slice(0, 100) });
    }
  }

  return { rel, isDeferred, findings };
}

function walkDir(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walkDir(full, results);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const allFiles = walkDir(SRC);

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
  // Limit per-file output for readability
  const shown = findings.slice(0, 25);
  for (const { lineNum, kind, snippet } of shown) {
    console.error(`     Line ${String(lineNum).padStart(4)}: ${kind.padEnd(28)} →  ${snippet}`);
  }
  if (findings.length > shown.length) {
    console.error(`     … and ${findings.length - shown.length} more`);
  }
}

if (errors.length > 0) {
  const totalErrors = errors.reduce((n, f) => n + f.findings.length, 0);
  console.error(`❌  ${totalErrors} hardcoded color/utility violation(s) in audited files.`);
  console.error(`Replace each with a semantic token from index.css (text-foreground,`);
  console.error(`bg-card, border-border, bg-primary, text-muted-foreground, etc.) or`);
  console.error(`add  // audit-ok: <reason>  to the same line if intentional.\n`);
  for (const { rel, findings } of errors) printGroup(rel, findings);
}

if (warnings.length > 0) {
  const totalWarns = warnings.reduce((n, f) => n + f.findings.length, 0);
  console.error(`\n⚠️   ${totalWarns} hardcoded color/utility match(es) in deferred files (warnings only).`);
  console.error(`Remove a file from DEFERRED_FILES in this script once its audit is complete.\n`);
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("✅  No hardcoded colors or brand utilities found.");
} else if (errors.length === 0) {
  console.log(`\n✅  No violations in audited files (${warnings.length} file(s) deferred).`);
}

process.exit(errors.length > 0 ? 1 : 0);
