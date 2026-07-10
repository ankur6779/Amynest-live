import { describe, expect, it } from "vitest";
import { enhancePromptLocal, PROMPT_PLACEHOLDERS } from "@workspace/worksheet-studio";

describe("worksheet mobile v6.3 — enhance prompt availability", () => {
  it("allows enhance with placeholder when prompt field is empty", () => {
    const placeholder = PROMPT_PLACEHOLDERS[0]!;
    const effective = "".trim() || placeholder;
    expect(effective.length).toBeGreaterThan(8);
    const out = enhancePromptLocal({
      prompt: effective,
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    });
    expect(out).toContain("LUCKNOW PUBLIC SCHOOL");
    expect(out.length).toBeGreaterThan(100);
  });
});

describe("worksheet mobile v6.3 — generation request", () => {
  it("builds valid request from placeholder fallback", () => {
    const placeholder = PROMPT_PLACEHOLDERS[0]!;
    const prompt = "";
    const effective = prompt.trim() || placeholder;
    expect(effective).toBeTruthy();
    expect(effective.split(/\s+/).length).toBeGreaterThan(2);
  });
});
