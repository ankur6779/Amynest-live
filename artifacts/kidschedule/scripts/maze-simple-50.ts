import { generateValidatedMaze } from "../src/lib/maze-generator.ts";

for (let i = 0; i < 50; i++) {
  const s = performance.now();
  generateValidatedMaze(5, "easy");
  console.log(i, (performance.now() - s).toFixed(2));
}
