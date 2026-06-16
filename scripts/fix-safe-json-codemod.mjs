#!/usr/bin/env node
/** Fixes multiline type breaks from migrate-client-safe-json.mjs */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../artifacts/kidschedule/src");

async function walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(full);
    else if (/\.tsx?$/.test(ent.name)) await fixFile(full);
  }
}

async function fixFile(file) {
  let src = await readFile(file, "utf8");
  if (!src.includes("parseApiJson<{>(res)")) return;
  const original = src;

  src = src.replace(
    /\(await parseApiJson<\{>\(res\)\)\s*\n([\s\S]*?)\n\s*\};/g,
    (m, body) => `await parseApiJson<{\n${body}\n        }>(res);`,
  );

  // generate.tsx-style partial type corruption
  src = src.replace(
    /\(await parseApiJson<\{([^>]*?)>\(res\)\)\s*;\s*([^}]+)\}\s*;/g,
    (m, partial, rest) => {
      return `await parseApiJson<{${partial};${rest}}>(res);`;
    },
  );

  if (src !== original) {
    await writeFile(file, src, "utf8");
    console.log("fixed", path.relative(root, file));
  }
}

await walk(root);
