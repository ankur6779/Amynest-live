/**
 * RC3 conformance evaluation — every checklist item resolved; writes certification artifacts.
 */
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { writeRc3Documentation } from "./write-rc3-docs";

const OUT_DIR = join(__dirname, "../../../../certification/birth-sky");

describe("RC3 conformance certification", () => {
  it("resolves every checklist item with no unknown statuses and writes RC3 package", () => {
    const result = writeRc3Documentation(OUT_DIR);
    const reportRaw = JSON.parse(
      readFileSync(join(OUT_DIR, "CONFORMANCE_REPORT.json"), "utf8"),
    ) as {
      summary: { unknown: number; fail: number; total: number };
      items: Array<{ id: string; status: string }>;
    };
    expect(reportRaw.summary.unknown).toBe(0);
    expect(reportRaw.summary.fail).toBe(0);
    expect(result.unknownCount).toBe(0);
    expect(reportRaw.items.find((i) => i.id === "P1")?.status).toBe("PASS");

    const checklist = readFileSync(join(OUT_DIR, "RELEASE_CHECKLIST.md"), "utf8");
    expect(checklist).toMatch(/birth_sky_rc3/);
    expect(checklist).toMatch(/RC3/);
    expect(existsSync(join(OUT_DIR, "GO_NO_GO.md"))).toBe(true);
    expect(existsSync(join(OUT_DIR, "WAIVER_REGISTER.md"))).toBe(true);
    expect(existsSync(join(OUT_DIR, "CANARY_PLAN.md"))).toBe(true);
    expect(existsSync(join(OUT_DIR, "FINAL_RELEASE_SUMMARY.md"))).toBe(true);

    const statusRows = checklist
      .split("\n")
      .filter((line) => /\|\s*(PASS|FAIL|WAIVED|PENDING|N\/A)\s*\|/.test(line));
    expect(statusRows.length).toBeGreaterThanOrEqual(8);
    for (const line of statusRows) {
      expect(line).not.toMatch(/\|\s*UNKNOWN\s*\|/i);
    }
  });
});
