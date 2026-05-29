/**
 * Generate permanent Learning Zone content bank (1100 items) for GCS.
 *
 * Usage: pnpm run generate:content-bank
 */
import { generateSmartStudyLessons } from "./content-bank/generators/smart-study.js";
import { generateLifeSkillsLessons } from "./content-bank/generators/life-skills.js";
import { generateEventPrepActivities } from "./content-bank/generators/event-prep.js";
import { generateMathProgressionPacks } from "./content-bank/generators/math-progression.js";
import { validateContentBank } from "./content-bank/validators.js";
import {
  buildStats,
  CONTENT_BANK_ROOT,
  writeCategory,
  writeManifest,
  writeStats,
} from "./content-bank/write-output.js";
import type { ContentBankManifest } from "./content-bank/types.js";

function main(): void {
  console.log("Generating Learning Zone content bank…");

  const smartStudy = generateSmartStudyLessons();
  const lifeSkills = generateLifeSkillsLessons();
  const eventPrep = generateEventPrepActivities();
  const mathProgression = generateMathProgressionPacks();

  const validations = [
    ...validateContentBank("smart-study", smartStudy, [
      "title",
      "description",
      "lessonContent",
      "questions",
      "answers",
      "funFact",
      "amyExplanation",
      "audioText",
    ]),
    ...validateContentBank("life-skills", lifeSkills, [
      "title",
      "story",
      "scenario",
      "question",
      "choices",
      "correctAnswer",
      "amyTip",
      "audioText",
    ]),
    ...validateContentBank("event-prep", eventPrep, [
      "title",
      "eventTheme",
      "speech",
      "practiceTips",
      "confidenceTips",
      "audioText",
    ]),
    ...validateContentBank("math-progression", mathProgression, [
      "title",
      "activities",
      "practiceQuestions",
      "answers",
      "amyHints",
      "audioText",
    ]),
  ];

  if (validations.length > 0) {
    console.error(`Validation failed with ${validations.length} issue(s):`);
    for (const v of validations.slice(0, 20)) {
      console.error(`  [${v.kind}] ${v.detail}`);
    }
    process.exit(1);
  }

  const ss = writeCategory("smart-study", "items", smartStudy);
  const ls = writeCategory("life-skills", "items", lifeSkills);
  const ep = writeCategory("event-prep", "items", eventPrep);
  const mp = writeCategory("math-progression", "items", mathProgression);

  const generatedAt = new Date().toISOString();
  const manifest: ContentBankManifest = {
    version: "1.0.0",
    generatedAt,
    totalItems: 1100,
    categories: {
      smartStudy: 500,
      lifeSkills: 300,
      eventPrep: 200,
      mathProgression: 100,
    },
    shards: {
      smartStudy: "smart-study/items.json",
      lifeSkills: "life-skills/items.json",
      eventPrep: "event-prep/items.json",
      mathProgression: "math-progression/items.json",
    },
  };
  writeManifest(manifest);

  const uncompressed =
    ss.bytes + ls.bytes + ep.bytes + mp.bytes;
  const gzipTotal =
    ss.gzipBytes + ls.gzipBytes + ep.gzipBytes + mp.gzipBytes;

  const stats = buildStats(smartStudy, lifeSkills, eventPrep, mathProgression, {
    uncompressed,
    gzip: gzipTotal,
  });
  writeStats(stats);

  console.log("\n── Content bank generated ──");
  console.log(`Root: ${CONTENT_BANK_ROOT}`);
  console.log(`Total items: ${stats.totalContentCount}`);
  console.log(`  Smart Study: ${stats.categoryCounts.smartStudy}`);
  console.log(`  Life Skills: ${stats.categoryCounts.lifeSkills}`);
  console.log(`  Event Prep: ${stats.categoryCounts.eventPrep}`);
  console.log(`  Math Progression: ${stats.categoryCounts.mathProgression}`);
  console.log("\nAge-band distribution:");
  for (const [band, count] of Object.entries(stats.ageBandDistribution).sort()) {
    console.log(`  ${band}: ${count}`);
  }
  console.log("\nDifficulty / confidence distribution:");
  for (const [d, count] of Object.entries(stats.difficultyDistribution).sort()) {
    console.log(`  ${d}: ${count}`);
  }
  console.log(
    `\nStorage (category JSON only): ${(uncompressed / 1024).toFixed(1)} KB uncompressed, ${(gzipTotal / 1024).toFixed(1)} KB gzip`,
  );
  console.log("\nGCS folder layout:");
  for (const line of stats.gcsFolderLayout) {
    console.log(`  ${line}`);
  }
  console.log("\nDone.");
}

main();
