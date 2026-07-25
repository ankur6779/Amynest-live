/**
 * A2 — domain layer purity (Pack 1 / Conformance A2).
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DOMAIN_ROOT = join(__dirname, "../domain");
const FORBIDDEN = [
  /from\s+["']react["']/,
  /from\s+["']react-dom["']/,
  /from\s+["']@capacitor/,
  /from\s+["']firebase/,
  /from\s+["']@firebase/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("IM-7 domain purity (A2)", () => {
  it("domain has no React/Firebase/Capacitor imports", () => {
    const files = walk(DOMAIN_ROOT);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const re of FORBIDDEN) {
        if (re.test(src)) violations.push(`${file} matches ${re}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
