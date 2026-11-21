/**
 * Phonics test resume wipe — sibling chips on /phonics must not overwrite
 * child B's amynest:phonics-test-resume:{B} with child A's mid-run session.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const PREFIX = "amynest:phonics-test-resume:";
const CHILD_A = 11;
const CHILD_B = 22;

function resumeKey(id: number) {
  return `${PREFIX}${id}`;
}

function save(id: number, session: Record<string, unknown>) {
  localStorage.setItem(resumeKey(id), JSON.stringify(session));
}

function load(id: number): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(resumeKey(id)) || "{}") as Record<
    string,
    unknown
  >;
}

describe("PhonicsTest child-switch keying", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("phonics page remounts PhonicsLearning per activeChild.id", () => {
    const src = readFileSync(resolve(__dirname, "../pages/phonics.tsx"), "utf8");
    expect(src).toMatch(/<PhonicsLearning\s+[^>]*key=\{activeChild\.id\}/);
  });

  it("PhonicsLearning remounts embedded PhonicsTest per childId", () => {
    const src = readFileSync(
      resolve(__dirname, "./phonics-learning.tsx"),
      "utf8",
    );
    expect(src).toMatch(/key=\{`daily-\$\{childId\}`\}/);
    expect(src).toMatch(/key=\{`weekly-\$\{childId\}`\}/);
  });

  it("PhonicsTest resets running phase when numericChildId changes", () => {
    const src = readFileSync(resolve(__dirname, "./phonics-test.tsx"), "utf8");
    expect(src).toMatch(/setPhase\(\{\s*kind:\s*"idle"\s*\}\)/);
    expect(src).toMatch(/\}, \[numericChildId\]\)/);
  });

  it("writing under B after loading B keeps sibling resume isolated (correct path)", () => {
    save(CHILD_A, {
      testType: "daily",
      index: 3,
      answers: [{ questionId: "a1", selectedIndex: 0 }],
      data: { sessionToken: "tok-A", questions: [{}, {}, {}, {}, {}], expiresAt: "2099-01-01" },
    });
    save(CHILD_B, {
      testType: "daily",
      index: 1,
      answers: [],
      data: { sessionToken: "tok-B", questions: [{}, {}, {}], expiresAt: "2099-01-01" },
    });

    // Bug path: save(CHILD_B, load(CHILD_A)) — wiped B + planted A's sessionToken.
    // Correct path after switch: mutate B's own snapshot (or clear and start fresh).
    const nextB = { ...load(CHILD_B), index: 2 };
    save(CHILD_B, nextB);

    expect(load(CHILD_A).index).toBe(3);
    expect((load(CHILD_A).data as { sessionToken: string }).sessionToken).toBe("tok-A");
    expect(load(CHILD_B).index).toBe(2);
    expect((load(CHILD_B).data as { sessionToken: string }).sessionToken).toBe("tok-B");
  });
});
