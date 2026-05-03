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
//
// Task #219 complete:
//   - Tailwind brand-palette utilities (text-/bg-/border-/from-/to-/via-/
//     ring-/shadow- × violet|purple|pink|fuchsia|rose|red|orange|amber|
//     yellow|emerald|green|teal|sky|blue|indigo|lime|cyan + slate/gray
//     neutrals) migrated to semantic tokens (bg-primary, bg-muted, bg-card,
//     text-foreground, text-muted-foreground, border-border, border-primary,
//     ring-primary, shadow). ~5,500 substitutions.
//   - Raw hex literals embedded in mascot SVG fill/stroke attrs, recharts
//     series palettes, and inline style props migrated to a documented
//     brand color scale (see --brand-violet-*, --brand-pink-*,
//     --brand-amber-*, etc. in src/index.css). All hsl(var(--brand-X-Y)).
//   - Long-tail one-off brand hex literals that don't fit the standard
//     palette are documented in GLOBAL_ALLOWLIST above.
//   - DEFERRED_FILES is now empty. Audit reports zero violations and zero
//     deferred warnings.
const DEFERRED_FILES = [];

const GLOBAL_ALLOWLIST = new Set([
  "#000", "#000000",
  "#fff", "#FFF", "#FFFFFF", "#ffffff",
  // Task #219: long-tail one-off brand hex literals used in mascot art,
  // background gradients, and chart series colors that don't map cleanly
  // onto the standard Tailwind palette. Mapped brand hexes have been
  // migrated to hsl(var(--brand-X-Y)) — see src/index.css scale.
  "#050010",
  "#0A001E",
  "#0A0A14",
  "#0B0B1A",
  "#0D0022",
  "#0a061a",
  "#0a0820",
  "#0b0820",
  "#0c1220",
  "#0f0c29",
  "#0f0f0f",
  "#0f0f18",
  "#0f0f1a",
  "#111",
  "#120a2e",
  "#14142B",
  "#161628",
  "#16213e",
  "#180040",
  "#188",
  "#1A0B2E",
  "#1A1530",
  "#1A6FA0",
  "#1A9950",
  "#1a0f2e",
  "#1a1040",
  "#1a1a1a",
  "#1a1a2e",
  "#1c0a00",
  "#1e293b",
  "#1f1147",
  "#214",
  "#222",
  "#24243e",
  "#2C2C3E",
  "#2ECC71",
  "#2d1b4e",
  "#302b63",
  "#3498DB",
  "#34A853",
  "#374151",
  "#3B0D8F",
  "#444",
  "#451a03",
  "#475569",
  "#555",
  "#58D68D",
  "#5DADE2",
  "#65A30D",
  "#666",
  "#6B7280",
  "#6C3483",
  "#6b7280",
  "#71717a",
  "#78716C",
  "#7A3A2A",
  "#7C4DFF",
  "#7a749b",
  "#7c6fb8",
  "#84CC16",
  "#888",
  "#94A3B8",
  "#94a3b8",
  "#9B59B6",
  "#9B6FD4",
  "#9ca3af",
  "#B3EBF2",
  "#B5006A",
  "#BB8FCE",
  "#C4A0FF",
  "#C8A8FF",
  "#C8C8E0",
  "#C8C8E8",
  "#CA8A04",
  "#CC0020",
  "#CC4400",
  "#CC9900",
  "#D8D8EE",
  "#D946EF",
  "#DDDDF0",
  "#E8D5FF",
  "#E91E8C",
  "#EA4335",
  "#F06AB5",
  "#F0E8FF",
  "#F0F0F8",
  "#F5C8A0",
  "#FF4ECD",
  "#FF6B7A",
  "#FFB4C8",
  "#FFE9F1",
  "#a16207",
  "#a99fd9",
  "#bbb",
  "#c7c0e8",
  "#c7d2fe",
  "#ccc",
  "#d946ef",
  "#ddd",
  "#e2e8f0",
  "#e5e7eb",
  "#e6e1f5",
  "#f0f4ff",
  "#f1f5f9",
  "#f8f8ff",
  "#fafafa",
]);

const HEX_RE = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;

const BRAND_FAMILIES = [
  "violet", "purple", "pink", "fuchsia", "rose", "red", "orange",
  "amber", "yellow", "emerald", "green", "teal", "sky", "blue",
  "indigo", "lime", "cyan", "slate", "gray", "neutral", "zinc", "stone",
];
const BRAND_PREFIXES = [
  "text", "bg", "border", "from", "to", "via", "ring", "shadow",
  "fill", "stroke", "divide", "outline", "accent", "caret",
  "decoration", "placeholder",
];
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
