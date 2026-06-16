#!/usr/bin/env node
/**
 * Migrates client-side `res.json()` API parsing to `parseApiJson(res)`.
 * Skips: safe-json-response.ts, poll-result.ts, test files, JSON.parse on non-Response.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetRoot = path.join(repoRoot, "artifacts/kidschedule/src");

const SKIP_FILES = new Set([
  "safe-json-response.ts",
  "poll-result.ts",
  "safe-fetch.ts",
  "safe-auth-fetch-json.ts",
]);

const stats = { migrated: 0, skipped: 0, files: [] };

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "__tests__" || ent.name === "node_modules") continue;
      await walk(full);
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
    if (SKIP_FILES.has(ent.name) || ent.name.includes(".test.")) continue;
    await migrateFile(full);
  }
}

async function migrateFile(filePath) {
  let src = await readFile(filePath, "utf8");
  if (!src.includes(".json(") && !src.includes("res.json")) return;

  const original = src;
  let localMigrations = 0;

  // (await res.json()) as Type -> (await parseApiJson<Type>(res))
  src = src.replace(
    /\(await\s+(\w+)\.json\(\)\)\s+as\s+([^;\n]+)/g,
    (_, resVar, typeExpr) => {
      localMigrations++;
      return `(await parseApiJson<${typeExpr.trim()}>(${resVar}))`;
    },
  );

  // await res.json().catch(() => ({})) -> await parseApiJson(res).catch(() => ({} as ...))
  src = src.replace(
    /await\s+(\w+)\.json\(\)\.catch\(\(\)\s*=>\s*\(\{\}\)\)/g,
    (_, resVar) => {
      localMigrations++;
      return `(await safeJsonResponse(${resVar}).then((p) => (p.ok ? p.data : {})))`;
    },
  );

  // return res.json() in mutationFn -> return parseApiJson(res)
  src = src.replace(/\breturn\s+(\w+)\.json\(\)/g, (_, resVar) => {
    localMigrations++;
    return `return parseApiJson(${resVar})`;
  });

  // const x = await res.json()
  src = src.replace(/\bawait\s+(\w+)\.json\(\)/g, (_, resVar) => {
    localMigrations++;
    return `await parseApiJson(${resVar})`;
  });

  if (localMigrations === 0 || src === original) {
    stats.skipped++;
    return;
  }

  const rel = path.relative(targetRoot, filePath);
  const needsParse = src.includes("parseApiJson") && !original.includes("parseApiJson");
  const needsSafe = src.includes("safeJsonResponse") && !original.includes("safeJsonResponse");

  if (needsParse || needsSafe) {
    const imports = [];
    if (needsParse) imports.push("parseApiJson");
    if (needsSafe) imports.push("safeJsonResponse");
    const importLine = `import { ${imports.join(", ")} } from "@/lib/safe-json-response";\n`;
    if (src.includes('@/lib/safe-json-response')) {
      src = src.replace(
        /import\s+\{([^}]+)\}\s+from\s+"@\/lib\/safe-json-response";/,
        (m, names) => {
          const existing = names.split(",").map((s) => s.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...imports])];
          return `import { ${merged.join(", ")} } from "@/lib/safe-json-response";`;
        },
      );
    } else {
      src = importLine + src;
    }
  }

  await writeFile(filePath, src, "utf8");
  stats.migrated += localMigrations;
  stats.files.push({ file: rel, replacements: localMigrations });
}

await walk(targetRoot);

console.log(JSON.stringify({ ...stats, fileCount: stats.files.length }, null, 2));
