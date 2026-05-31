#!/usr/bin/env node
/**
 * Writes global-first olympiad banks to lib/olympiad/data/*.json
 * Run: pnpm --filter @workspace/olympiad run generate:banks
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGlobalOlympiadBanks, globalBankCounts } from "../src/global-bank-builder.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

mkdirSync(dataDir, { recursive: true });

const banks = buildGlobalOlympiadBanks();
for (const [subject, questions] of Object.entries(banks)) {
  const path = join(dataDir, `${subject}.json`);
  writeFileSync(path, JSON.stringify(questions, null, 0));
  console.log(`Wrote ${questions.length} questions → ${path}`);
}

const counts = globalBankCounts();
const min = Math.min(...Object.values(counts));
console.log("\nCounts:", counts);
if (min < 500) {
  console.error(`ERROR: each subject must have 500+ questions (min=${min})`);
  process.exit(1);
}
console.log("OK: all subjects have 500+ questions");
