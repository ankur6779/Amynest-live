import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQuizQuestion,
  getAllAnimals,
  getAnimalsByCategory,
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
