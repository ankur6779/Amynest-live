/**
 * Node benchmark: 50 maze generations (no browser).
 * Run: pnpm exec tsx scripts/maze-gen-benchmark.ts
 */
import { adaptiveMazeSize } from "../src/lib/game-maze-analytics.ts";
import { enableMazeGenProfiling, disableMazeGenProfiling, mazeGenProfileStats } from "../src/lib/maze-gen-profile.ts";
import { generateValidatedMaze } from "../src/lib/maze-generator.ts";
import { GAME_SESSION_ROUNDS } from "../src/lib/game-session-progression.ts";
import type { GameDifficulty } from "../src/lib/game-difficulty.ts";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "certification/output/maze-runtime-profile");
const difficulties: GameDifficulty[] = ["easy", "normal", "hard"];

enableMazeGenProfiling();

for (let round = 0; round < 50; round++) {
  const difficulty = difficulties[round % difficulties.length]!;
  const roundIdx = round % GAME_SESSION_ROUNDS;
  const size = adaptiveMazeSize(roundIdx, difficulty, GAME_SESSION_ROUNDS);
  generateValidatedMaze(size, difficulty);
}

const entries = disableMazeGenProfiling();
const stats = mazeGenProfileStats(entries);

const report = {
  at: new Date().toISOString(),
  environment: "node-tsx",
  rounds: 50,
  stats,
  maxEntry: [...entries].sort((a, b) => b.durationMs - a.durationMs)[0],
  slowEntries: entries.filter((e) => e.durationMs > 50),
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "fifty-round-node.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
