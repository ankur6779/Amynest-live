import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePuzzle } from "./generators.ts";
import { generateMiniGame, isMiniGameTemplate } from "./mini-game-generators.ts";

describe("math-playground mini-game-generators", () => {
  it("detects mini-game templates", () => {
    assert.equal(isMiniGameTemplate("pop_correct_answer"), true);
    assert.equal(isMiniGameTemplate("bigger_number"), false);
  });

  it("generates pop correct answer payload", () => {
    const payload = generateMiniGame("pop_correct_answer", "4-5", 42, "standard");
    assert.equal(payload.template, "pop_correct_answer");
    assert.ok(payload.question?.includes("+"));
    assert.equal(payload.choices?.length, 3);
    assert.ok((payload.correctIndex ?? -1) >= 0);
  });

  it("generates castle builder with rounds", () => {
    const payload = generateMiniGame("castle_builder", "6-7", 99, "standard");
    assert.equal(payload.castlePiecesTotal, 3);
    assert.equal(payload.castleRounds?.length, 3);
  });

  it("keeps legacy-only pool when mini games disabled", () => {
    for (let seed = 0; seed < 30; seed++) {
      const payload = generatePuzzle("4-5", seed, "standard");
      assert.equal(isMiniGameTemplate(payload.template), false);
    }
  });

  it("can emit mini games when enabled", () => {
    let sawMini = false;
    for (let seed = 0; seed < 500; seed++) {
      const payload = generatePuzzle("4-5", seed, "standard", { enableMiniGames: true });
      if (isMiniGameTemplate(payload.template)) {
        sawMini = true;
        break;
      }
    }
    assert.equal(sawMini, true);
  });
});
