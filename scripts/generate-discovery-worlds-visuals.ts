/**
 * Generate discovery world visual assets (hero/card/thumbnail WebP) and upload to GCS.
 * Mirrors audio ops: local staging + skip-if-exists on bucket.
 *
 *   pnpm run generate:discovery-worlds-visuals
 *   pnpm run generate:discovery-worlds-visuals -- --force
 *   pnpm run generate:discovery-worlds-visuals -- --world=animal_world
 *   pnpm run generate:discovery-worlds-visuals -- --local-only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import { getAllAnimals } from "@workspace/animal-world";
import {
  expectedVisualAssetsForManifest,
  type ExpectedVisualAsset,
  type WorldManifest,
  type WorldId,
} from "@workspace/world-engine";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import { renderItemVisualSet } from "./lib/discovery-visual-render.js";

const REPO_ROOT = join(import.meta.dirname, "..");
const LOCAL_OUT = join(REPO_ROOT, "artifacts/kidschedule/public/world-visuals");

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

const INTER_ITEM_MS = Number(process.env.DISCOVERY_WORLDS_VISUAL_INTER_MS ?? "80");

type WorldEntry = { worldId: WorldId | "animal_world"; label: string; manifest: WorldManifest };

function getBucketName(): string {
  return (
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    "amynest-audio-storage"
  );
}

function renderEnvJsonCandidates(raw: string): string[] {
  const t = raw.trim();
  const out = new Set<string>([t]);
  const push = (s: string) => {
    if (s.trim()) out.add(s);
  };
  if (t.includes("\\n")) push(t.replace(/\\n/g, "\n"));
  if (t.includes('\\"')) push(t.replace(/\\"/g, '"'));
  let combo = t;
  if (combo.includes("\\n")) combo = combo.replace(/\\n/g, "\n");
  if (combo.includes('\\"')) combo = combo.replace(/\\"/g, '"');
  push(combo);
  return [...out];
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  for (const s of renderEnvJsonCandidates(raw)) {
    try {
      return JSON.parse(s) as Record<string, unknown>;
    } catch {
      /* try next */
    }
  }
  try {
    return JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseRenderEnvJsonLine(text: string, key: string): Record<string, unknown> | null {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  const eq = line.indexOf("=");
  let val = line.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return tryParseJsonObject(val);
}

function loadGcsCredentialsFromRenderEnvFile(): Record<string, unknown> | null {
  const envPath = `${REPO_ROOT}/Amynest-backend-dykj.env`;
  try {
    const text = readFileSync(envPath, "utf8");
    return (
      parseRenderEnvJsonLine(text, "GCS_SERVICE_ACCOUNT_JSON") ??
      parseRenderEnvJsonLine(text, "FIREBASE_SERVICE_ACCOUNT_JSON")
    );
  } catch {
    return null;
  }
}

function buildStorage(): Storage {
  const fromFile = loadGcsCredentialsFromRenderEnvFile();
  if (fromFile) {
    return new Storage({
      credentials: fromFile as Storage["options"]["credentials"],
      projectId: typeof fromFile.project_id === "string" ? fromFile.project_id : undefined,
    });
  }
  const json = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const creds = tryParseJsonObject(json);
    if (creds) {
      return new Storage({
        credentials: creds as Storage["options"]["credentials"],
        projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
      });
    }
  }
  return new Storage();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function animalManifest(): WorldManifest {
  const items = getAllAnimals().map((a) => {
    const base = a.imageGcsPath.replace(/\/?hero\.webp$/i, "");
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      emoji: a.emoji,
      imageGcsPath: a.imageGcsPath,
      heroRealGcsPath: a.heroRealGcsPath ?? a.imageGcsPath,
      heroCartoonGcsPath: a.heroCartoonGcsPath ?? `${base}/card.webp`,
      funFact: a.funFact,
      quizSoundId: a.quizSoundId,
      quizPrompt: a.quizPrompt,
      narration: a.narration,
      sounds: a.sounds.map((s) => ({
        id: s.id,
        label: s.label,
        gcsPath: s.gcsPath,
        durationSec: s.durationSec,
        waveform: s.waveform,
      })),
    };
  });
  return { version: 1, worldId: "animal_world", categories: [], items };
}

function allWorlds(): WorldEntry[] {
  return [
    { worldId: "animal_world", label: "Animal World", manifest: animalManifest() },
    { worldId: "vehicle_world", label: "Vehicles", manifest: getVehicleWorldManifest() },
    { worldId: "nature_world", label: "Nature", manifest: getNatureWorldManifest() },
    { worldId: "home_sounds_world", label: "Home", manifest: getHomeSoundsManifest() },
    { worldId: "instrument_world", label: "Instruments", manifest: getInstrumentWorldManifest() },
  ];
}

function parseWorldFilter(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--world="));
  if (!arg) return null;
  return new Set([arg.slice("--world=".length).trim()]);
}

function localPathForGcs(gcsPath: string): string {
  return join(LOCAL_OUT, gcsPath);
}

async function uploadToGcs(
  storage: Storage,
  bucket: string,
  gcsPath: string,
  buffer: Buffer,
): Promise<void> {
  await storage.bucket(bucket).file(gcsPath).save(buffer, {
    contentType: "image/webp",
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
}

async function gcsObjectExists(storage: Storage, bucket: string, gcsPath: string): Promise<boolean> {
  const [ok] = await storage.bucket(bucket).file(gcsPath).exists();
  return ok;
}

type ItemVisualWork = {
  itemId: string;
  itemName: string;
  emoji: string;
  category: string;
  assets: ExpectedVisualAsset[];
};

function groupWorkByItem(manifest: WorldManifest): ItemVisualWork[] {
  const byId = new Map<string, ItemVisualWork>();
  for (const item of manifest.items) {
    const assets = expectedVisualAssetsForManifest({
      version: 1,
      worldId: manifest.worldId,
      categories: [],
      items: [item],
    });
    byId.set(item.id, {
      itemId: item.id,
      itemName: item.name,
      emoji: item.emoji,
      category: item.category,
      assets,
    });
  }
  return [...byId.values()];
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const localOnly = process.argv.includes("--local-only");
  const dryRun = process.argv.includes("--dry-run");
  const worldFilter = parseWorldFilter(process.argv);
  const bucket = getBucketName();
  const storage = buildStorage();
  mkdirSync(LOCAL_OUT, { recursive: true });

  const worlds = allWorlds().filter((w) => !worldFilter || worldFilter.has(w.worldId));

  let itemsTotal = 0;
  let assetsTotal = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { worldId, label, manifest } of worlds) {
    const itemWorks = groupWorkByItem(manifest);
    itemsTotal += itemWorks.length;
    assetsTotal += itemWorks.length * 3;
    console.log(`[discovery-worlds-visuals] ${label} (${worldId}): ${itemWorks.length} items → gs://${bucket}/`);

    for (const work of itemWorks) {
      const paths = {
        hero: work.assets.find((a) => a.kind === "hero")!.gcsPath,
        card: work.assets.find((a) => a.kind === "card")!.gcsPath,
        thumbnail: work.assets.find((a) => a.kind === "thumbnail")!.gcsPath,
      };

      if (dryRun) continue;

      if (!force && !localOnly) {
        try {
          const [heroOk, cardOk, thumbOk] = await Promise.all([
            gcsObjectExists(storage, bucket, paths.hero),
            gcsObjectExists(storage, bucket, paths.card),
            gcsObjectExists(storage, bucket, paths.thumbnail),
          ]);
          if (heroOk && cardOk && thumbOk) {
            skipped += 3;
            console.log(`[skip] ${work.itemId} (all 3 on GCS)`);
            continue;
          }
        } catch (err) {
          console.warn(`[warn] GCS check ${work.itemId}:`, err);
        }
      }

      try {
        const { hero, card, thumbnail } = await renderItemVisualSet(work.emoji, work.category);
        const files: Array<{ gcsPath: string; buffer: Buffer }> = [
          { gcsPath: paths.hero, buffer: hero },
          { gcsPath: paths.card, buffer: card },
          { gcsPath: paths.thumbnail, buffer: thumbnail },
        ];

        for (const { gcsPath, buffer: generatedBuffer } of files) {
          const localFile = localPathForGcs(gcsPath);
          mkdirSync(dirname(localFile), { recursive: true });

          let buffer = generatedBuffer;
          if (!force && existsSync(localFile)) {
            buffer = readFileSync(localFile);
          } else {
            writeFileSync(localFile, buffer);
          }

          if (!localOnly) {
            if (!force) {
              try {
                if (await gcsObjectExists(storage, bucket, gcsPath)) {
                  skipped += 1;
                  console.log(`[skip] ${gcsPath}`);
                  continue;
                }
              } catch {
                /* upload anyway */
              }
            }
            await uploadToGcs(storage, bucket, gcsPath, buffer);
          } else if (!force && existsSync(localFile) && buffer === generatedBuffer) {
            skipped += 1;
            console.log(`[skip-local] ${gcsPath}`);
            continue;
          }

          created += 1;
          console.log(`[ok] ${gcsPath} (${buffer.length} bytes)`);
        }
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[fail] ${work.itemId} ${work.itemName}: ${msg}`);
      }

      await sleep(INTER_ITEM_MS);
    }
  }

  console.log("\n=== Discovery Worlds Visuals ===");
  console.log(`Items: ${itemsTotal} · Assets expected: ${assetsTotal}`);
  console.log(`Created/uploaded: ${created} · Skipped: ${skipped} · Failed: ${failed}`);
  if (dryRun) {
    console.log("(dry-run — no files written)");
    return;
  }
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
