// Parent Hub i18n audit. Walks the curated list of Parent Hub source files
// (web + mobile) and flags any JSX text node, JSX string-literal attribute,
// or string literal that is plain English instead of being routed through
// `t(...)` / a localized constant.
//
// The audit is intentionally narrow:
//   • only files we have already converted are scanned (so we don't fail
//     CI on unrelated artifacts)
//   • only "user-visible" strings are flagged — JSX text content and a
//     known list of attribute names (title, label, aria-label,
//     accessibilityLabel, placeholder, alt, etc.)
//   • single-line `// audit-ok…` and `{/* audit-ok… */}` escape hatches
//     suppress an offending node, mirroring the existing repo conventions
//   • technical / non-translatable values (icon glyph names, testID, asset
//     paths, etc.) are skipped via a dedicated allow-list
//
// Run via:  pnpm --filter @workspace/scripts audit:parent-hub-i18n
// Wired into root `pnpm typecheck` so accidental hard-coded English in any
// converted Parent Hub file blocks the green build.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/src → repo root is two levels up.
const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * Curated list of converted Parent Hub source files. New files added to
 * the conversion campaign should be appended here so the audit picks
 * them up on the next run. Paths are relative to the repo root.
 */
const TARGET_FILES: readonly string[] = [
  // Web — kidschedule
  "artifacts/kidschedule/src/components/locked-block.tsx",
  "artifacts/kidschedule/src/components/sub-item-gate.tsx",
  "artifacts/kidschedule/src/components/event-prep-card.tsx",
  "artifacts/kidschedule/src/components/smart-study-zone.tsx",
  "artifacts/kidschedule/src/components/future-predictor.tsx",
  "artifacts/kidschedule/src/components/stage-milestones-card.tsx",
  "artifacts/kidschedule/src/components/age-based-sections.tsx",
  "artifacts/kidschedule/src/components/try-free-badge.tsx",
  "artifacts/kidschedule/src/components/parent-command-center.tsx",
  "artifacts/kidschedule/src/components/amy-icon.tsx",
  "artifacts/kidschedule/src/pages/parenting-hub.tsx",
  // Mobile — amynest-mobile
  "artifacts/amynest-mobile/components/TryFreeBadge.tsx",
  "artifacts/amynest-mobile/components/PremiumBadge.tsx",
  "artifacts/amynest-mobile/components/LockedBlock.tsx",
  "artifacts/amynest-mobile/components/FuturePredictor.tsx",
  "artifacts/amynest-mobile/app/(tabs)/hub.tsx",
];

/**
 * JSX attribute names whose values must be localised. Anything else (style,
 * className, onPress, key, ref, testID, etc.) is treated as machine text
 * and excluded from the scan.
 */
const TRANSLATABLE_ATTRS = new Set([
  "title",
  "label",
  "aria-label",
  "ariaLabel",
  "accessibilityLabel",
  "placeholder",
  "alt",
]);

/**
 * Object-literal property names that almost always end up rendered as
 * user-visible copy (tile metadata arrays, suggestion lists, prompt
 * libraries, etc.). When the value is a plain English string literal, it
 * needs to be moved into the i18n bundle. Use a `// audit-ok` comment on
 * the same line to allow intentional non-translatable values.
 */
const TRANSLATABLE_OBJECT_KEYS = new Set([
  "title",
  "description",
  "desc",
  "label",
  "sublabel",
  "subtitle",
  "lead",
  "cta",
  "prompt",
  "heading",
  "body",
  "soon",
  "empty",
  "placeholder",
]);

/**
 * Heuristic: only treat a string literal as English prose worth flagging
 * when it contains a real word (≥2 letters, optionally followed by more
 * words) AND a space, OR is a multi-word capitalised phrase. This filters
 * out icon names, css tokens, hex colors, ids, etc.
 */
function looksLikeEnglishProse(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 4) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  // Exclude obvious technical strings.
  if (/^[a-z][a-zA-Z0-9_-]*$/.test(trimmed)) return false; // single token
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return false; // hex color
  if (/^rgba?\(/.test(trimmed)) return false; // rgba() value
  if (/^[A-Z][A-Z0-9_]*$/.test(trimmed)) return false; // ENUM_NAME
  if (/^\.?\/?[A-Za-z0-9_./@-]+\.(png|jpg|jpeg|svg|webp|ttf|otf|json|css)$/.test(trimmed))
    return false;
  // Must contain at least one space-separated word OR be a multi-word
  // CamelCase phrase ("Try Free", "Add Child", etc.).
  const wordCount = trimmed.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w)).length;
  if (wordCount < 2) return false;
  return true;
}

interface Finding {
  file: string;
  line: number;
  column: number;
  text: string;
  kind: "jsx-text" | "jsx-attr" | "object-literal";
}

/**
 * Returns true when the given line carries an explicit `audit-ok` escape
 * hatch (either `// audit-ok…` or `{/* audit-ok… *\/}` style). Used for
 * intentional English copy that should not be translated (URLs, brand
 * names, dev-only debug overlays, etc.).
 */
function hasAuditOk(rawLine: string): boolean {
  return /audit-ok/.test(rawLine);
}

/**
 * Naive JSX scanner that finds:
 *   1. Text between `>` and `<` inside JSX (i.e. JSX children that are
 *      plain string literals, not `{...}` expressions).
 *   2. JSX attribute string-literal values for a translatable attribute.
 *
 * Avoids pulling in @babel/parser to keep the audit fast and zero-deps.
 * The regex-based heuristic accepts a few false negatives (e.g. complex
 * nested expressions) in exchange for not requiring a full AST. The
 * `audit-ok` escape hatch lets us mark intentional English when the
 * heuristic over-fires.
 */
function scanFile(file: string, source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  // 1) JSX attribute string literals: `attr="value"` or `attr='value'`
  const attrRe = /\s([A-Za-z][A-Za-z0-9_:-]*)=(?:"([^"\n]*)"|'([^'\n]*)')/g;
  // 2) JSX text node: `>text<` (the simplest possible heuristic — plenty
  //    of false negatives for multiline text, but good enough as a smoke
  //    test for hard-coded copy).
  const textRe = />([^<>{}\n][^<>{}]*)</g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (hasAuditOk(line)) continue;

    let m: RegExpExecArray | null;
    attrRe.lastIndex = 0;
    while ((m = attrRe.exec(line)) !== null) {
      const attrName = m[1];
      const value = m[2] ?? m[3] ?? "";
      if (!TRANSLATABLE_ATTRS.has(attrName)) continue;
      if (!looksLikeEnglishProse(value)) continue;
      findings.push({
        file,
        line: i + 1,
        column: m.index + 1,
        text: `${attrName}="${value}"`,
        kind: "jsx-attr",
      });
    }

    textRe.lastIndex = 0;
    while ((m = textRe.exec(line)) !== null) {
      const value = m[1];
      if (!looksLikeEnglishProse(value)) continue;
      findings.push({
        file,
        line: i + 1,
        column: m.index + 1,
        text: value.trim(),
        kind: "jsx-text",
      });
    }

    // 3) Object-literal property: `title: "..."`, `description: "..."`,
    //    `label: '...'`, etc. Catches metadata arrays / config objects
    //    whose values bypass the JSX scanner (e.g. SECTION_2_PREVIEW_TILES,
    //    AMY_PROMPTS, EMOTIONAL_CARDS).
    const objRe = /(?:^|[\s,{])([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?:"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`)/g;
    objRe.lastIndex = 0;
    while ((m = objRe.exec(line)) !== null) {
      const propName = m[1];
      const value = m[2] ?? m[3] ?? m[4] ?? "";
      if (!TRANSLATABLE_OBJECT_KEYS.has(propName)) continue;
      if (!looksLikeEnglishProse(value)) continue;
      findings.push({
        file,
        line: i + 1,
        column: m.index + 1,
        text: `${propName}: "${value}"`,
        kind: "object-literal",
      });
    }
  }
  return findings;
}

async function main(): Promise<void> {
  const allFindings: Finding[] = [];
  for (const rel of TARGET_FILES) {
    const abs = path.join(REPO_ROOT, rel);
    let source: string;
    try {
      source = await fs.readFile(abs, "utf8");
    } catch {
      console.error(`audit-parent-hub-i18n: missing target file: ${rel}`);
      process.exitCode = 2;
      continue;
    }
    allFindings.push(...scanFile(rel, source));
  }

  if (allFindings.length === 0) {
    console.log(
      `audit-parent-hub-i18n: clean — ${TARGET_FILES.length} files scanned, no hard-coded English found.`,
    );
    return;
  }

  console.error(
    `audit-parent-hub-i18n: found ${allFindings.length} suspected hard-coded English string(s):`,
  );
  for (const f of allFindings) {
    console.error(`  ${f.file}:${f.line}:${f.column}  [${f.kind}]  ${f.text}`);
  }
  console.error(
    "\nFix by routing the string through `t('parent_hub.…')` or add a `// audit-ok` comment if intentional.",
  );
  process.exitCode = 1;
}

void main();
