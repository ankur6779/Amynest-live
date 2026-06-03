import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildHearFindQuestion,
  buildQuizQuestion,
  bumpMastery,
  defaultProgressV2,
  getAllAnimals,
  getAnimalsByCategory,
  gradeHearFindAnswer,
  gradeQuizAnswer,
  resolveAnimalSoundUrl,
} from "./index.js";

test("catalog loads animals across categories", () => {
  const animals = getAllAnimals();
  assert.ok(animals.length >= 8);
  assert.ok(getAnimalsByCategory("farm").length >= 2);
  assert.ok(getAnimalsByCategory("wild").some((a) => a.id === "lion"));
});

test("resolveAnimalSoundUrl uses API proxy", () => {
  const lion = getAllAnimals().find((a) => a.id === "lion");
  assert.ok(lion);
  const url = resolveAnimalSoundUrl(lion!.sounds[0]);
  assert.match(url, /^\/api\/animal-world-library\/animal-world\//);
});

test("quiz engine builds valid question", () => {
  const question = buildQuizQuestion(getAllAnimals());
  assert.ok(question);
  assert.equal(question!.options.length, 3);
  const wrong = gradeQuizAnswer(question!, question!.options[1].animalId);
  const correct = gradeQuizAnswer(question!, question!.correctAnimalId);
  assert.equal(correct.correct, true);
  assert.equal(wrong.correct, wrong.selectedAnimalId === question!.correctAnimalId);
});

test("hear-find engine builds 3-4 options", () => {
  const question = buildHearFindQuestion(getAllAnimals(), { optionCount: 4 });
  assert.ok(question);
  assert.ok(question!.options.length >= 3);
  const result = gradeHearFindAnswer(question!, question!.correctAnimalId);
  assert.equal(result.correct, true);
});

test("default progress v2 is empty", () => {
  const p = defaultProgressV2();
  assert.equal(p.xp, 0);
  assert.equal(p.explorerTier, "none");
});

test("bumpMastery accumulates soundsPlayed across sequential patches", () => {
  let progress = defaultProgressV2();
  for (let i = 0; i < 3; i++) {
    const current = progress.animalMastery.lion?.soundsPlayed ?? 0;
    progress = bumpMastery(progress, "lion", { soundsPlayed: current + 1 });
  }
  assert.equal(progress.animalMastery.lion?.soundsPlayed, 3);
});
