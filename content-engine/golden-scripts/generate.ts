/**
 * Generate the AmyNest Golden Script Library markdown files.
 * Scripts only — no video, image, render, or publish.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGoldenScript } from "./build.js";
import { allGoldenSeeds } from "./seeds.js";
import { renderGoldenScriptMarkdown, renderLibraryIndex } from "./render.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = here;

export function generateGoldenScriptLibrary(options?: { outDir?: string }) {
  const dir = options?.outDir ?? outDir;
  mkdirSync(dir, { recursive: true });

  const seeds = allGoldenSeeds();
  if (seeds.length !== 50) {
    throw new Error(`Expected 50 golden seeds, found ${seeds.length}`);
  }

  const scripts = seeds.map((seed, index) => buildGoldenScript(seed, index + 1));

  for (const script of scripts) {
    writeFileSync(join(dir, script.filename), renderGoldenScriptMarkdown(script), "utf8");
  }

  writeFileSync(
    join(dir, "GOLDEN_SCRIPT_LIBRARY.md"),
    renderLibraryIndex(scripts),
    "utf8",
  );

  const avg =
    Math.round(
      (scripts.reduce((s, x) => s + x.quality.overall, 0) / scripts.length) * 10,
    ) / 10;

  return {
    count: scripts.length,
    averageScore: avg,
    minScore: Math.min(...scripts.map((s) => s.quality.overall)),
    files: [
      "GOLDEN_SCRIPT_LIBRARY.md",
      ...scripts.map((s) => s.filename),
    ],
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const result = generateGoldenScriptLibrary();
  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
      },
      null,
      2,
    ),
  );
}
