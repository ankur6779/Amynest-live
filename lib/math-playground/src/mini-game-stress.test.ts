import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateMiniGame,
  MINI_GAME_TEMPLATES,
} from "./mini-game-generators.ts";
import type { PlaygroundAgeBand, AdaptivityTier } from "./types.ts";

const AGE_BANDS: PlaygroundAgeBand[] = ["2-3", "4-5", "6-7", "7-8"];
const TIERS: AdaptivityTier[] = ["ease", "standard", "stretch"];

function assertCompletable(template: (typeof MINI_GAME_TEMPLATES)[number], seed: number) {
  for (const ageBand of AGE_BANDS) {
    for (const tier of TIERS) {
      const payload = generateMiniGame(template, ageBand, seed, tier);

      switch (template) {
        case "pop_correct_answer":
        case "rocket_counting": {
          const answer = payload.correctAnswer ?? payload.choices?.[payload.correctIndex ?? 0];
          assert.ok(answer !== undefined, `${template} missing answer seed=${seed}`);
          assert.ok(payload.choices?.includes(answer!), `${template} answer not in choices seed=${seed}`);
          break;
        }
        case "balloon_burst": {
          assert.ok((payload.targetQuantity ?? 0) >= 2);
          assert.ok((payload.balloons?.length ?? 0) > (payload.targetQuantity ?? 0));
          break;
        }
        case "feed_the_monkey":
          assert.ok((payload.targetBananas ?? 0) >= 2);
          break;
        case "number_train": {
          const correct = payload.correctAnswer ?? 0;
          assert.ok(payload.trainChoices?.includes(correct), `number_train missing correct choice seed=${seed}`);
          break;
        }
        case "castle_builder": {
          assert.equal(payload.castleRounds?.length, payload.castlePiecesTotal);
          for (const round of payload.castleRounds ?? []) {
            assert.ok(round.choices.includes(round.answer), `castle round missing answer seed=${seed}`);
          }
          break;
        }
      }
    }
  }
}

describe("mini-game stress — 100 sessions per template", () => {
  for (const template of MINI_GAME_TEMPLATES) {
    it(`${template} payloads are always completable`, () => {
      for (let seed = 0; seed < 100; seed++) {
        assertCompletable(template, seed);
      }
    });
  }
});
