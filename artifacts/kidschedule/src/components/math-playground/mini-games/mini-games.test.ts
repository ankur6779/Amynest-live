import { describe, expect, it, beforeEach } from "vitest";
import { generateMiniGame, MINI_GAME_TEMPLATES } from "@workspace/math-playground";

describe("mini-game completion guards", () => {
  it("every template produces valid completable payload", () => {
    for (const template of MINI_GAME_TEMPLATES) {
      for (let seed = 0; seed < 20; seed++) {
        const payload = generateMiniGame(template, "4-5", seed, "standard");
        expect(payload.template).toBe(template);

        if (template === "pop_correct_answer" || template === "rocket_counting") {
          const answer = payload.correctAnswer ?? payload.choices?.[payload.correctIndex ?? 0];
          expect(payload.choices).toContain(answer);
        }
        if (template === "balloon_burst") {
          expect((payload.balloons?.length ?? 0)).toBeGreaterThan(payload.targetQuantity ?? 0);
        }
        if (template === "number_train") {
          expect(payload.trainChoices).toContain(payload.correctAnswer);
        }
      }
    }
  });
});

describe("math-playground feature flags mini games", () => {
  beforeEach(() => {
    import.meta.env.VITE_MP_MINI_GAMES = "1";
  });

  it("mini games flag can be enabled", async () => {
    const { isMpMiniGamesEnabled } = await import("../lib/feature-flags");
    expect(isMpMiniGamesEnabled()).toBe(true);
  });
});
