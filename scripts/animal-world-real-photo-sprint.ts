/**
 * Animal World Real Photo Completion Sprint
 *   pnpm run animal-world-real-photo-sprint
 *   pnpm run animal-world-real-photo-sprint -- --analyze-only
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllAnimals, getAnimalHeroRealGcsPath, type Animal } from "@workspace/animal-world";
import { buildGcsStorage, gcsObjectExists, getGcsBucketName, hasGcsCredentials } from "./lib/gcs-storage.js";
import {
  classifyError,
  fetchAnimalPhotoFromProviders,
  renderHeroRealWebp,
  type FailureReason,
  type PhotoSource,
} from "./lib/animal-real-photo-providers.js";
import { validateHeroRealWebp } from "./lib/animal-real-photo-validate.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_VISUAL = join(REPO_ROOT, "artifacts/kidschedule/public/world-visuals");
const REPORT_JSON = join(REPO_ROOT, "artifacts/kidschedule/public/animal-world-real-photo-report.json");
const COVERAGE_JSON = join(REPO_ROOT, "artifacts/kidschedule/public/animal-world-real-photo-coverage.json");

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

const INTER_MS = Number(process.env.ANIMAL_REAL_PHOTO_INTER_MS ?? "1500");
const LOG_GLOBS = ["/tmp/real-heroes.log", "/tmp/real-heroes-2.log", "/tmp/real-heroes-3.log"];

type AnimalRow = {
  animalId: string;
  animalName: string;
  failureReason: FailureReason;
  lastError?: string;
  hasLocalFile: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function localHeroPath(animal: Animal): string {
  return join(LOCAL_VISUAL, getAnimalHeroRealGcsPath(animal.category, animal.id));
}

function parseHistoricalFailures(): Map<string, { reason: FailureReason; msg: string }> {
  const map = new Map<string, { reason: FailureReason; msg: string }>();
  for (const logPath of LOG_GLOBS) {
    if (!existsSync(logPath)) continue;
    const text = readFileSync(logPath, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/\[fail\] ([a-z0-9-]+): (.+)$/);
      if (!m) continue;
      const id = m[1]!;
      const msg = m[2]!;
      let reason: FailureReason = "unknown";
      if (msg.includes("rate") || msg.includes("429") || msg.includes("too many")) {
        reason = "wikimedia_rate_limit";
      } else if (msg.includes("no_commons") || msg.includes("no photo")) {
        reason = "page_not_found";
      } else if (msg.includes("HTTP 400") || msg.includes("HTTP 403") || msg.includes("HTTP 404")) {
        reason = "download_failed";
      } else if (msg.includes("invalid")) {
        reason = "invalid_image";
      } else if (msg.includes("sharp") || msg.includes("conversion")) {
        reason = "conversion_failed";
      }
      map.set(id, { reason, msg });
    }
  }
  return map;
}

async function isPresentAndValid(animal: Animal): Promise<boolean> {
  const path = localHeroPath(animal);
  if (!existsSync(path)) return false;
  const buf = readFileSync(path);
  const v = await validateHeroRealWebp(buf);
  return v.ok;
}

function buildFailureReport(
  animals: Animal[],
  historical: Map<string, { reason: FailureReason; msg: string }>,
): { rows: AnimalRow[]; countByReason: Record<string, number> } {
  const rows: AnimalRow[] = [];
  for (const animal of animals) {
    const hist = historical.get(animal.id);
    rows.push({
      animalId: animal.id,
      animalName: animal.name,
      failureReason: hist?.reason ?? "unknown",
      lastError: hist?.msg,
      hasLocalFile: existsSync(localHeroPath(animal)),
    });
  }
  const countByReason: Record<string, number> = {};
  for (const r of rows) {
    countByReason[r.failureReason] = (countByReason[r.failureReason] ?? 0) + 1;
  }
  return { rows, countByReason };
}

async function generateForAnimal(
  animal: Animal,
  storage: ReturnType<typeof buildGcsStorage>,
  bucket: string,
  opts: { wikimediaOnly?: boolean; skipWikimedia?: boolean },
): Promise<{ ok: boolean; source?: PhotoSource; reason?: FailureReason }> {
  const gcsPath = getAnimalHeroRealGcsPath(animal.category, animal.id);
  const localFile = localHeroPath(animal);
  mkdirSync(dirname(localFile), { recursive: true });

  if (await isPresentAndValid(animal)) {
    return { ok: true, source: undefined };
  }

  try {
    const { buffer, source } = await fetchAnimalPhotoFromProviders(animal.id, animal.name, opts);
    const webp = await renderHeroRealWebp(buffer);
    const outCheck = await validateHeroRealWebp(webp);
    if (!outCheck.ok) {
      return { ok: false, reason: "conversion_failed" };
    }
    writeFileSync(localFile, webp);
    if (hasGcsCredentials(REPO_ROOT)) {
      await storage.bucket(bucket).file(gcsPath).save(webp, {
        contentType: "image/webp",
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
    }
    console.log(`[ok] ${animal.id} via ${source} → ${gcsPath}`);
    return { ok: true, source };
  } catch (e) {
    const reason = classifyError(e);
    console.error(`[fail] ${animal.id}: ${reason} — ${e instanceof Error ? e.message : e}`);
    return { ok: false, reason };
  }
}

async function writeCoverageReport(blockers: string[]): Promise<void> {
  const all = getAllAnimals();
  let present = 0;
  const missingIds: string[] = [];
  for (const a of all) {
    if (await isPresentAndValid(a)) present += 1;
    else missingIds.push(a.id);
  }
  const total = all.length;
  const payload = {
    generatedAt: new Date().toISOString(),
    totalAnimals: total,
    realPhotosPresent: present,
    realPhotosMissing: total - present,
    coveragePercent: total > 0 ? Math.round((present / total) * 100) : 0,
    blockers: missingIds.length
      ? [`${missingIds.length} animals missing valid hero-real.webp`, ...blockers]
      : [],
    missingAnimalIds: missingIds,
  };
  writeFileSync(COVERAGE_JSON, `${JSON.stringify(payload, null, 2)}\n`);
}

function parseOnly(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(arg.slice("--only=".length).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

async function main(): Promise<void> {
  const analyzeOnly = process.argv.includes("--analyze-only");
  const only = parseOnly(process.argv);
  const all = getAllAnimals().filter((a) => !only || only.has(a.id));
  const historical = parseHistoricalFailures();

  const missing: Animal[] = [];
  for (const a of all) {
    if (!(await isPresentAndValid(a))) missing.push(a);
  }

  const { rows, countByReason } = buildFailureReport(missing, historical);
  const reportPayload = {
    generatedAt: new Date().toISOString(),
    totalMissing: missing.length,
    countByReason,
    animals: rows,
  };
  writeFileSync(REPORT_JSON, `${JSON.stringify(reportPayload, null, 2)}\n`);
  console.log(`\n=== Step 1: Failure analysis ===`);
  console.log(`Wrote ${REPORT_JSON}`);
  console.log(`totalMissing: ${missing.length}`);
  console.log(`countByReason:`, countByReason);

  if (analyzeOnly) {
    await writeCoverageReport([]);
    console.log(`Wrote ${COVERAGE_JSON}`);
    return;
  }

  const storage = hasGcsCredentials(REPO_ROOT) ? buildGcsStorage(REPO_ROOT) : buildGcsStorage(REPO_ROOT);
  const bucket = getGcsBucketName();

  const rateLimited = missing.filter((a) => {
    const r = rows.find((x) => x.animalId === a.id);
    return r?.failureReason === "wikimedia_rate_limit";
  });
  const pageNotFound = missing.filter((a) => {
    const r = rows.find((x) => x.animalId === a.id);
    return r?.failureReason === "page_not_found" || r?.failureReason === "image_not_found" || r?.failureReason === "unknown";
  });
  const others = missing.filter((a) => !rateLimited.includes(a) && !pageNotFound.includes(a));

  console.log(`\n=== Step 2: Retry rate-limited (${rateLimited.length}) ===`);
  for (const animal of rateLimited) {
    if (await isPresentAndValid(animal)) continue;
    await generateForAnimal(animal, storage, bucket, { wikimediaOnly: true });
    await sleep(INTER_MS);
  }

  console.log(`\n=== Step 3–4: Mappings + multi-source (${pageNotFound.length + others.length} remaining) ===`);
  const remaining: Animal[] = [];
  for (const a of all) {
    if (!(await isPresentAndValid(a))) remaining.push(a);
  }
  const skipWikimedia = process.argv.includes("--skip-wikimedia");
  for (const animal of remaining) {
    await generateForAnimal(animal, storage, bucket, { skipWikimedia });
    await sleep(INTER_MS);
  }

  await writeCoverageReport([]);
  const cov = JSON.parse(readFileSync(COVERAGE_JSON, "utf8")) as {
    coveragePercent: number;
    realPhotosPresent: number;
    totalAnimals: number;
    blockers: string[];
  };
  console.log(`\n=== Step 7: Coverage ===`);
  console.log(`Wrote ${COVERAGE_JSON}`);
  console.log(`${cov.realPhotosPresent}/${cov.totalAnimals} (${cov.coveragePercent}%)`);
  if (cov.blockers.length) {
    console.log("Blockers:");
    for (const b of cov.blockers) console.log(`  - ${b}`);
  }
  if (cov.coveragePercent < 100) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
