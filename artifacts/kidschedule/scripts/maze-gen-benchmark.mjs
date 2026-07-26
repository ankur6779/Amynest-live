/**
 * Node benchmark — 50-round maze generation profile (no browser).
 */
import { adaptiveMazeSize } from "../src/lib/game-maze-analytics";
import {
  disableMazeGenProfiling,
  enableMazeGenProfiling,
  mazeGenProfileStats,
} from "../src/lib/maze-gen-profile";
import { generateValidatedMaze } from "../src/lib/maze-generator";
import type { GameDifficulty } from "../src/lib/game-difficulty";
import { GAME_SESSION_ROUNDS } from "../src/lib/game-session-progression";

const difficulties: GameDifficulty[] = ["easy", "normal", "hard"];

function runRound(roundIdx: number, difficulty: GameDifficulty) {
  const size = adaptiveMazeSize(roundIdx, difficulty, GAME_SESSION_ROUNDS);
  generateValidatedMaze(size, difficulty);
}

enableMazeGenProfiling();
for (let i = 0; i < 50; i++) {
  const difficulty = difficulties[i % difficulties.length]!;
  const roundIdx = i % GAME_SESSION_ROUNDS;
  runRound(roundIdx, difficulty);
}
const entries = disableMazeGenProfiling();
const stats = mazeGenProfileStats(entries);

console.log(JSON.stringify({ source: "node-50-rounds", stats, entries }, null, 2));
