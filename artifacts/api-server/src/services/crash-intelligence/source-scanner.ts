import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SourceLocation } from "./types.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

export type ScannedHookSite = {
  file: string;
  line: number;
  hook: SourceLocation["hook"];
  snippet: string;
  hasSetValue: boolean;
};

/**
 * Lightweight read-only source scan — regex-based, not full AST.
 * Validates / supplements playbook line numbers.
 */
export function scanFileForHookSites(relativePath: string): ScannedHookSite[] {
  const abs = join(REPO_ROOT, relativePath);
  if (!existsSync(abs)) return [];

  const content = readFileSync(abs, "utf8");
  const lines = content.split("\n");
  const sites: ScannedHookSite[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;

    if (/useEffect\s*\(/.test(line)) {
      const block = lines.slice(i, Math.min(i + 25, lines.length)).join("\n");
      sites.push({
        file: relativePath,
        line: lineNum,
        hook: "useEffect",
        snippet: line.trim().slice(0, 120),
        hasSetValue: /setValue\s*\(/.test(block),
      });
    }
    if (/useWatch\s*\(/.test(line)) {
      sites.push({
        file: relativePath,
        line: lineNum,
        hook: "useWatch",
        snippet: line.trim().slice(0, 120),
        hasSetValue: false,
      });
    }
    if (/\.setValue\s*\(/.test(line) && !sites.some((s) => s.line === lineNum)) {
      sites.push({
        file: relativePath,
        line: lineNum,
        hook: "handler",
        snippet: line.trim().slice(0, 120),
        hasSetValue: true,
      });
    }
  }

  return sites;
}

export function validateSourceMappingLines(input: {
  file: string;
  line: number;
  hook: SourceLocation["hook"];
}): { valid: boolean; actualSnippet?: string } {
  const sites = scanFileForHookSites(input.file);
  const match = sites.find(
    (s) =>
      s.line === input.line ||
      (input.line > 0 && Math.abs(s.line - input.line) <= 3 && s.hook === input.hook),
  );
  if (!match) {
    const near = sites.find((s) => Math.abs(s.line - input.line) <= 10);
    return { valid: false, actualSnippet: near?.snippet };
  }
  return { valid: true, actualSnippet: match.snippet };
}
