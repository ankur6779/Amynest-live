#!/usr/bin/env node
/** Fix codemod corruption: parseApiJson<{ partial>(var)); rest }; */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../artifacts/kidschedule/src");

async function walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(full);
    else if (/\.tsx?$/.test(ent.name)) await fix(full);
  }
}

async function fix(file) {
  let src = await readFile(file, "utf8");
  const original = src;

  // (await parseApiJson<{ a>(r)); b };  -> (await parseApiJson<{ a; b }>(r));
  src = src.replace(
    /\(await parseApiJson<\{([^>]*?)>\((r|res)\)\)\);\s*([^}]+)\}\s*;/g,
    (_, typeStart, v, typeRest) =>
      `(await parseApiJson<{${typeStart};${typeRest.trim()}}>(${v}));`,
  );

  // return (await parseApiJson<{ a>(r)); b };
  src = src.replace(
    /return \(await parseApiJson<\{([^>]*?)>\((r|res)\)\)\);\s*([^}]+)\}\s*;/g,
    (_, typeStart, v, typeRest) =>
      `return (await parseApiJson<{${typeStart};${typeRest.trim()}}>(${v}));`,
  );

  // const x = (await parseApiJson<{ a>(res)); b };
  src = src.replace(
    /=\s*\(await parseApiJson<\{([^>]*?)>\((r|res)\)\)\);\s*([^}]+)\}\s*;/g,
    (_, typeStart, v, typeRest) =>
      `= (await parseApiJson<{${typeStart};${typeRest.trim()}}>(${v}));`,
  );

  // multiline: (await parseApiJson<{>(r)) ... };
  src = src.replace(
    /\(await parseApiJson<\{>\((r|res)\)\)\s*\n([\s\S]*?)\n\s*\};/g,
    (_, v, body) => `(await parseApiJson<{\n${body}\n      }>(${v}));`,
  );

  src = src.replace(
    /return \(await parseApiJson<\{>\((r|res)\)\)\s*\n([\s\S]*?)\n\s*\};/g,
    (_, v, body) => `return (await parseApiJson<{\n${body}\n      }>(${v}));`,
  );

  if (src !== original) {
    await writeFile(file, src, "utf8");
    console.log("fixed", path.relative(root, file));
  }
}

await walk(root);
