#!/usr/bin/env node
/**
 * check-on-dark-marker.js
 *
 * Catches new "intentionally-dark" surfaces (a violet/slate/black hero card,
 * a dark video player, a dark CTA button, …) that forget to mark themselves
 * with the `data-on-dark` attribute.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 * `artifacts/kidschedule/src/index.css` ships a "safety net" that rewrites
 * raw `text-white`, `bg-white/[5|10|20]`, and `border-white/[5|10|20]`
 * back to readable theme tokens in LIGHT mode — except inside elements
 * tagged `data-on-dark` (or descendants of such an element).
 *
 * That means an intentionally-dark surface MUST opt out via `data-on-dark`,
 * otherwise its white text gets rewritten to dark foreground and becomes
 * invisible against the dark background once a user is in light mode.
 * In dark mode everything looks fine — so the bug ships silently.
 *
 * ── What this script does ───────────────────────────────────────────────
 * For every JSX opening tag in `artifacts/kidschedule/src/**`, it checks:
 *
 *   • Does the tag set a "solid dark surface" Tailwind class on itself,
 *     i.e. one of:
 *         bg-black                            (no opacity modifier)
 *         bg-slate-700 / 800 / 900
 *         bg-gray-700  / 800 / 900
 *     …without a `dark:` / `hover:` / `focus:` / `group-hover:` etc.
 *     prefix (those don't apply in the default light state, so they
 *     don't make the surface dark by default)?
 *
 *   • If yes, does the SAME tag (or anything inside the tag's
 *     opening `<...>`) carry `data-on-dark` or the suppression marker
 *     `data-on-dark-ok`?
 *
 *   • If no marker is present → fail with a file:line:snippet report.
 *
 * Translucent overlays such as `bg-black/40` or `bg-slate-800/30` are
 * intentionally ignored — they are darkening overlays painted on top of
 * an image/video and are not the surface the safety net cares about.
 *
 * ── Suppression ─────────────────────────────────────────────────────────
 * If a flag is a false positive (e.g. the dark class only applies under
 * a runtime condition that is mutually exclusive with the visible state),
 * add the attribute `data-on-dark-ok` (optionally with a string reason)
 * to the same tag, e.g.:
 *
 *   <div data-on-dark-ok="overlay only when modal closed" className="bg-black">
 *
 * ── Usage ───────────────────────────────────────────────────────────────
 *   node artifacts/kidschedule/scripts/check-on-dark-marker.js
 *
 * Exit codes:
 *   0 – clean
 *   1 – one or more dark surfaces are missing `data-on-dark`
 */

import fs   from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Config ─────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ROOT     = path.resolve(__dirname, "..");
const SRC_DIR  = path.join(ROOT, "src");

/**
 * A "solid dark surface" class. The opacity-suffix forms (`bg-black/40`,
 * `bg-slate-900/50`, …) are deliberately NOT in this set because they are
 * translucent overlays, not the underlying surface the safety net cares
 * about.
 *
 * We use a single combined regex with:
 *   - a negative lookbehind to reject modifier prefixes (`dark:`, `hover:`,
 *     `group-hover:`, `focus:`, `lg:`, …) and arbitrary preceding word
 *     characters (so we don't match `mybg-black` or `super-bg-slate-700`)
 *   - a negative lookahead to reject the opacity suffix (`bg-black/30`)
 *     and digit/word continuations (so `bg-slate-7000` won't match)
 */
const DARK_SURFACE_RE =
  /(?<![\w:-])(?:bg-(?:slate|gray)-[789]00|bg-black)(?![/\w-])/;

// JSX tag opener detector: starts at `<`, requires an identifier-ish
// character right after, walks forward respecting strings, template
// literals, and brace nesting until the matching `>` (or `/>`).
const TAG_NAME_HEAD = /[A-Za-z]/;

// ─── JSX opening-tag scanner ────────────────────────────────────────────────

/**
 * Walk a source string and yield each JSX opening tag as a span.
 *
 * Tracks string and brace state so that JSX attribute expressions like
 *   className={cn("bg-slate-700", cond && "x > y")}
 * don't terminate the tag prematurely on the inner `>`.
 *
 * Returns: Array<{ start, end, text, line }>
 *   line is the 1-based line number of the `<`.
 */
function findOpeningTags(source) {
  const tags = [];
  const len  = source.length;

  // Pre-compute line starts for fast offset → line lookup.
  const lineStarts = [0];
  for (let i = 0; i < len; i++) {
    if (source[i] === "\n") lineStarts.push(i + 1);
  }
  const offsetToLine = (offset) => {
    // Binary search.
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };

  let i = 0;
  while (i < len) {
    const c = source[i];

    // Skip JS line comments — but only those clearly outside JSX.
    // The scanner is a heuristic; we don't do a full parse. The comment
    // skip prevents us from mistaking `// <Foo>` for a JSX tag.
    if (c === "/" && source[i + 1] === "/") {
      while (i < len && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < len - 1 && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    if (c !== "<" || !TAG_NAME_HEAD.test(source[i + 1] || "")) {
      i++;
      continue;
    }

    // Found `<X…` — walk to the matching `>` honouring nested braces and
    // strings.
    const start = i;
    let j       = i + 1;
    let braces  = 0;
    let str     = null; // ', ", `, or null
    // Stack of pending template-literal interpolations. When `braces`
    // returns to a frame's `braceDepth` we re-enter the template literal
    // (str = frame.quote). This is what lets us walk past
    //   data-testid={`foo-${bar.id}`}
    // without losing track that we were inside a backtick string.
    const tmplStack = [];
    let closed  = false;

    while (j < len) {
      const cj = source[j];

      if (str) {
        if (cj === "\\") { j += 2; continue; }
        // Template-literal `${ … }` opens a JS interpolation. Remember
        // the brace depth and the enclosing quote so we can restore it.
        if (str === "`" && cj === "$" && source[j + 1] === "{") {
          tmplStack.push({ braceDepth: braces, quote: str });
          braces++;
          j += 2;
          str = null;
          continue;
        }
        if (cj === str)  { str = null; j++; continue; }
        j++;
        continue;
      }

      if (cj === "'" || cj === '"' || cj === "`") {
        str = cj;
        j++;
        continue;
      }
      if (cj === "{") { braces++; j++; continue; }
      if (cj === "}") {
        braces--;
        // If we just closed a `${ … }` interpolation, hop back into the
        // template literal that contained it.
        if (
          tmplStack.length > 0 &&
          braces === tmplStack[tmplStack.length - 1].braceDepth
        ) {
          str = tmplStack.pop().quote;
        }
        j++;
        continue;
      }

      if (braces === 0 && cj === ">") {
        j++;                    // include the `>`
        closed = true;
        break;
      }
      j++;
    }

    if (!closed) {
      // Malformed / EOF — bail and continue scanning past this `<`.
      i++;
      continue;
    }

    tags.push({
      start,
      end:  j,
      text: source.slice(start, j),
      line: offsetToLine(start),
    });
    i = j;
  }

  return tags;
}

// ─── Per-file scan ──────────────────────────────────────────────────────────

function scanFile(filePath) {
  const rel    = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const source = fs.readFileSync(filePath, "utf8");
  const tags   = findOpeningTags(source);
  const findings = [];

  for (const tag of tags) {
    const m = tag.text.match(DARK_SURFACE_RE);
    if (!m) continue;

    // Must NOT have data-on-dark or data-on-dark-ok on the same element.
    // We match on word boundaries so attribute lookups don't accidentally
    // match a substring of some larger identifier.
    if (/\bdata-on-dark(-ok)?\b/.test(tag.text)) continue;

    // Compute the line of the offending class within the tag for a more
    // useful pointer.
    const matchOffsetInTag = m.index ?? 0;
    const linesBeforeMatch = tag.text
      .slice(0, matchOffsetInTag)
      .split("\n").length - 1;
    const lineNum = tag.line + linesBeforeMatch;

    // Snippet: the line that actually contains the offending class.
    const fileLines = source.split("\n");
    const snippet   = (fileLines[lineNum - 1] || "").trimEnd().slice(0, 140);

    findings.push({ lineNum, klass: m[0], snippet });
  }

  return { rel, findings };
}

// ─── File walking ───────────────────────────────────────────────────────────

function walkDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walkDir(full, results);
    } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const allFiles = walkDir(SRC_DIR);
const errors   = [];

for (const file of allFiles) {
  const { rel, findings } = scanFile(file);
  if (findings.length > 0) errors.push({ rel, findings });
}

if (errors.length === 0) {
  console.log(
    "✅  No dark-surface drift detected — every solid-dark element in " +
    "kidschedule/src is properly tagged with `data-on-dark`."
  );
  process.exit(0);
}

const total = errors.reduce((n, e) => n + e.findings.length, 0);
console.error(
  `❌  ${total} dark-surface element(s) missing \`data-on-dark\`.`
);
console.error(
  "    These will appear correctly in dark mode but their white text will\n" +
  "    be rewritten to dark foreground (and become invisible) in light\n" +
  "    mode by the safety net in artifacts/kidschedule/src/index.css.\n\n" +
  "    Fix by adding `data-on-dark` to the same JSX tag, e.g.\n\n" +
  '      <div data-on-dark className="bg-slate-800 text-white">…</div>\n\n' +
  "    If the flag is a false positive (e.g. the class only applies to a\n" +
  "    branch that is never visible in light mode), add `data-on-dark-ok`\n" +
  "    with a brief reason instead:\n\n" +
  '      <div data-on-dark-ok="overlay only behind modal" className="bg-black">…</div>\n'
);

for (const { rel, findings } of errors) {
  console.error(`\n  📄 ${rel} (${findings.length} item${findings.length === 1 ? "" : "s"})`);
  for (const { lineNum, klass, snippet } of findings) {
    console.error(
      `     Line ${String(lineNum).padStart(4)}: ${klass.padEnd(14)} →  ${snippet}`
    );
  }
}

process.exit(1);
