import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = join(import.meta.dirname, "..");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "playwright" || entry.endsWith(".test.ts") || entry.endsWith(".test.tsx") || entry.endsWith(".spec.ts")) {
      continue;
    }
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe("foldable responsive forensic contract", () => {
  it("does not encode Fold8 or iPhone Duo device identity in production UI code", () => {
    const files = walk(srcDir);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (/Fold8|iPhone Duo|Galaxy Z Fold/i.test(text)) {
        hits.push(relative(srcDir, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it("does not hard-code Fold cover/main pixel resolutions in production UI code", () => {
    const files = walk(srcDir);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (/1248\s*[x×]\s*1972|1848\s*[x×]\s*2448/.test(text)) {
        hits.push(relative(srcDir, file));
      }
    }
    expect(hits).toEqual([]);
  });
});
