/**
 * Care Health wrong-childId keying — sibling switch must not sync under the
 * newly selected child while React still holds the previous child's profile.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Care Health child-switch keying", () => {
  it("HealthLabPage remounts the zone per child id", () => {
    const src = readFileSync(
      resolve(__dirname, "../../pages/health-lab.tsx"),
      "utf8",
    );
    expect(src).toMatch(/<HealthLabZone\s+key=\{child\.id\}/);
  });

  it("hook persist/session writers bind sync to profile.childId and reset on switch", () => {
    const hookSrc = readFileSync(
      resolve(__dirname, "./hooks/use-health-lab-state.ts"),
      "utf8",
    );
    // Synchronous reset when the hub child id changes (reuse without remount).
    expect(hookSrc).toMatch(
      /useEffect\(\(\) => \{[\s\S]*loadHealthLabState\(childId\)[\s\S]*\}, \[childId\]\)/,
    );
    // Persist must enqueue the written profile, not a possibly-stale hook prop.
    expect(hookSrc).toMatch(/enqueueHealthLabSync\(next\.childId\)/);
    // Session complete must POST under the persisted profile child.
    expect(hookSrc).toMatch(/postHealthLabSession\(next\.childId,\s*result\)/);
    // Persist before session POST (avoids pre-session snapshot under wrong id).
    expect(hookSrc.indexOf("persist(next)")).toBeLessThan(
      hookSrc.indexOf("postHealthLabSession(next.childId, result)"),
    );
    // Refuse session attribution when in-memory profile disagrees with prop.
    expect(hookSrc).toMatch(/state\.childId !== childId/);
  });
});
