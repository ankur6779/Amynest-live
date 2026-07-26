import {
  disableMazeGenProfiling,
  enableMazeGenProfiling,
  mazeGenProfileStats,
} from "../src/lib/maze-gen-profile.ts";
import {
  generateValidatedMaze,
  generateValidatedMazeYieldExperiment,
} from "../src/lib/maze-generator.ts";

async function main() {
  enableMazeGenProfiling();
  let t0 = performance.now();
  for (let i = 0; i < 50; i++) {
    generateValidatedMaze(
      5 + (i % 8),
      i % 3 === 2 ? "hard" : i % 3 === 1 ? "normal" : "easy",
    );
  }
  const sync = {
    wallMs: performance.now() - t0,
    stats: mazeGenProfileStats(disableMazeGenProfiling()),
  };

  enableMazeGenProfiling();
  t0 = performance.now();
  for (let i = 0; i < 50; i++) {
    await generateValidatedMazeYieldExperiment(
      5 + (i % 8),
      i % 3 === 2 ? "hard" : i % 3 === 1 ? "normal" : "easy",
    );
  }
  const yielded = {
    wallMs: performance.now() - t0,
    stats: mazeGenProfileStats(disableMazeGenProfiling()),
  };

  console.log(JSON.stringify({ sync, yielded }, null, 2));
}

void main();
