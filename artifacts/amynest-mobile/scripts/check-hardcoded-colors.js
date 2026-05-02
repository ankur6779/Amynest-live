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
 *
 * Audit note (Task #178): DEFERRED_FILES = [] is intentional. Every
 * runtime screen uses useColors() from ThemeContext, and the static-
 * dark public flows (welcome, sign-in, sign-up, onboarding, paywall,
 * tutorial, index) carry explicit `audit-ok` markers on each hex.
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
const DEFERRED_FILES = [];

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
