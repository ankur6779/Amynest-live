/**
 * Backfill story_content.gcs_url for videos already uploaded to GCS (story-hub/*).
 *
 * Story Hub playback uses /api/stories/stream/:driveFileId (server pipes GCS).
 * Clients never receive signed URLs — we store the stable public GCS URL in DB.
 *
 * Usage:
 *   pnpm run map:story-hub-gcs              # map drive-id objects → DB gcs_url
 *   pnpm run map:story-hub-gcs -- --report  # list title-named uploads (wrong pattern)
 *   pnpm run map:story-hub-gcs -- --fix-rename [--dry-run]  # rename Title.mp4 → {driveId}.mp4 + map
 *   pnpm run map:story-hub-gcs -- --fix-rename --create-missing  # also insert DB rows for GCS-only uploads
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import pg from "pg";
import { REPO_ROOT } from "./static-audio-paths.js";

const { Pool } = pg;
const GCS_PREFIX = "story-hub/";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
config({ path: `${REPO_ROOT}/.env.development`, override: true });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

function parseRenderEnvJsonLine(text: string, key: string): Record<string, unknown> | null {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  const eq = line.indexOf("=");
  let val = line.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  val = val.replace(/\\"/g, '"');
  try {
    return JSON.parse(val) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(val.replace(/\\n/g, "\n")) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function loadGcsCredentials(): Record<string, unknown> | null {
  const raw = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  try {
    const text = readFileSync(`${REPO_ROOT}/Amynest-backend-dykj.env`, "utf8");
    return (
      parseRenderEnvJsonLine(text, "GCS_SERVICE_ACCOUNT_JSON") ??
      parseRenderEnvJsonLine(text, "FIREBASE_SERVICE_ACCOUNT_JSON")
    );
  } catch {
    return null;
  }
}

function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/^dpg-[a-z0-9-]+$/i.test(u.hostname) && !u.hostname.includes(".")) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`;
    }
    if (u.hostname.includes("render.com") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url;
  }
}

function poolFor(url: string): pg.Pool {
  const normalized = normalizeDatabaseUrl(url);
  const needsSsl =
    /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(normalized) ||
    process.env.PGSSLMODE === "require";
  return new Pool({
    connectionString: normalized,
    max: 4,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

function publicGcsUrl(bucketId: string, objectName: string): string {
  return `https://storage.googleapis.com/${bucketId}/${objectName}`;
}

/** story-hub/{driveFileId}.{ext} → drive file id */
function driveFileIdFromObjectName(objectName: string): string | null {
  if (!objectName.startsWith(GCS_PREFIX)) return null;
  const base = objectName.slice(GCS_PREFIX.length);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = base.slice(0, dot);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}

/** Same rules as artifacts/api-server/src/routes/stories.ts normalizeTitle */
function normalizeTitle(rawName: string): string {
  const noExt = rawName.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
  const cleaned = noExt
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const minor = new Set(["a", "an", "and", "the", "of", "in", "for", "to"]);
  return cleaned
    .split(" ")
    .map((w, i) => {
      if (!w) return w;
      const lower = w.toLowerCase();
      if (i > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function matchKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^copy of\s+/i, "")
    .replace(/\.[a-zA-Z0-9]{2,5}$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extFromObjectName(objectName: string): string {
  const base = objectName.slice(GCS_PREFIX.length);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "mp4";
}

function targetObjectName(driveFileId: string, ext: string): string {
  return `${GCS_PREFIX}${driveFileId}.${ext}`;
}

function classifyCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\b(bedtime|sleep|goodnight|lullaby|night|moon|dream)\b/.test(t)) return "bedtime";
  if (/\b(moral|fable|aesop|panchatantra|lesson|virtue|honesty|kind|brave|patience)\b/.test(t))
    return "moral";
  if (/\b(funny|fun|silly|laugh|joke|dance|adventure|monkey|jungle|party)\b/.test(t)) return "fun";
  return "general";
}

/** Stable id for videos uploaded directly to GCS (not in Drive catalog). */
function gcsOnlyDriveFileId(baseName: string): string {
  const hash = createHash("sha256").update(matchKey(baseName)).digest("base64url").slice(0, 22);
  return `gcs_${hash}`;
}

type StoryRow = {
  id: number;
  drive_file_id: string;
  title: string;
  original_name: string;
  gcs_url: string | null;
};

async function fixTitleNamedUploads(options: {
  bucketId: string;
  storage: Storage;
  pool: pg.Pool;
  invalidNames: string[];
  dryRun: boolean;
  createMissing: boolean;
}): Promise<void> {
  const { bucketId, storage, pool, invalidNames, dryRun, createMissing } = options;
  const bucket = storage.bucket(bucketId);

  const { rows: stories } = await pool.query<StoryRow>(
    `select id, drive_file_id, title, original_name, gcs_url
     from story_content where active = true`,
  );

  const byKey = new Map<string, StoryRow[]>();
  for (const story of stories) {
    for (const key of [
      matchKey(story.title),
      matchKey(normalizeTitle(story.title)),
      matchKey(story.original_name),
      matchKey(normalizeTitle(story.original_name)),
    ]) {
      if (!key) continue;
      const list = byKey.get(key) ?? [];
      list.push(story);
      byKey.set(key, list);
    }
  }

  let renamed = 0;
  let mapped = 0;
  let unmatched = 0;
  let ambiguous = 0;
  const unmatchedList: string[] = [];

  for (const objectName of invalidNames) {
    const base = objectName.slice(GCS_PREFIX.length);
    const keys = [
      matchKey(base),
      matchKey(normalizeTitle(base)),
    ].filter(Boolean);
    let candidates: StoryRow[] = [];
    for (const key of keys) {
      const hit = byKey.get(key);
      if (hit?.length) {
        candidates = hit;
        break;
      }
    }
    const unique = [...new Map(candidates.map((s) => [s.id, s])).values()];
    let story: StoryRow | undefined;
    if (unique.length === 0) {
      if (!createMissing) {
        unmatched += 1;
        unmatchedList.push(objectName);
        continue;
      }
      const title = normalizeTitle(base);
      const driveFileId = gcsOnlyDriveFileId(base);
      const ext = extFromObjectName(objectName);
      const targetName = targetObjectName(driveFileId, ext);
      const publicUrl = publicGcsUrl(bucketId, targetName);
      if (dryRun) {
        console.log(`[dry-run] create+rename ${base} → ${targetName} (${title})`);
        renamed += 1;
        mapped += 1;
        continue;
      }
      await pool.query(
        `insert into story_content (
           drive_file_id, title, original_name, category, mime_type, folder_id,
           active, gcs_url, gcs_synced_at, created_at, updated_at
         ) values ($1, $2, $3, $4, 'video/mp4', 'gcs-direct', true, $5, now(), now(), now())
         on conflict (drive_file_id) do update set
           title = excluded.title,
           original_name = excluded.original_name,
           gcs_url = excluded.gcs_url,
           gcs_synced_at = now(),
           active = true,
           updated_at = now()`,
        [driveFileId, title, base, classifyCategory(title), publicUrl],
      );
      const dest = bucket.file(targetName);
      const [destExists] = await dest.exists();
      if (!destExists) {
        await bucket.file(objectName).copy(dest);
        renamed += 1;
      }
      await bucket.file(objectName).delete({ ignoreNotFound: true });
      mapped += 1;
      continue;
    }
    if (unique.length > 1) {
      ambiguous += 1;
      console.warn(`[ambiguous] ${objectName} → ${unique.map((s) => s.title).join(" | ")}`);
      continue;
    }

    story = unique[0]!;
    const ext = extFromObjectName(objectName);
    const targetName = targetObjectName(story.drive_file_id, ext);
    const publicUrl = publicGcsUrl(bucketId, targetName);

    if (dryRun) {
      console.log(`[dry-run] ${base} → ${targetName} (${story.title})`);
      renamed += 1;
      mapped += 1;
      continue;
    }

    const dest = bucket.file(targetName);
    const [destExists] = await dest.exists();
    if (!destExists) {
      await bucket.file(objectName).copy(dest);
      renamed += 1;
    }
    await bucket.file(objectName).delete({ ignoreNotFound: true });

    await pool.query(
      `update story_content
       set gcs_url = $1, gcs_synced_at = now(), updated_at = now()
       where id = $2`,
      [publicUrl, story.id],
    );
    mapped += 1;
  }

  console.log("\n── Fix rename summary ──");
  console.log(`Renamed/copied:  ${renamed}${dryRun ? " (dry-run)" : ""}`);
  console.log(`DB mapped:       ${mapped}${dryRun ? " (dry-run)" : ""}`);
  console.log(`Unmatched:       ${unmatched}`);
  console.log(`Ambiguous:       ${ambiguous}`);
  if (unmatchedList.length > 0 && unmatchedList.length <= 20) {
    for (const n of unmatchedList) console.log(`  ${n}`);
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const reportOnly = process.argv.includes("--report");
  const fixRename = process.argv.includes("--fix-rename");
  const createMissing = process.argv.includes("--create-missing");
  const bucketId =
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() ||
    process.env.GCS_BUCKET_NAME?.trim() ||
    process.env.GCS_BUCKET?.trim();

  if (!bucketId) {
    console.error("Missing DEFAULT_OBJECT_STORAGE_BUCKET_ID (or GCS_BUCKET_NAME)");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const creds = loadGcsCredentials();
  const storage = creds
    ? new Storage({
        credentials: creds as never,
        projectId: String(creds.project_id ?? creds.projectId ?? ""),
      })
    : new Storage();

  console.log(`Listing gs://${bucketId}/${GCS_PREFIX}* …`);
  const [files] = await storage.bucket(bucketId).getFiles({ prefix: GCS_PREFIX });
  const videoFiles = files.filter((f) => {
    const name = f.name;
    return name.length > GCS_PREFIX.length && name.includes(".") && !name.endsWith("/");
  });

  const gcsByDriveId = new Map<string, { objectName: string; publicUrl: string }>();
  const invalidNames: string[] = [];
  for (const file of videoFiles) {
    const driveFileId = driveFileIdFromObjectName(file.name);
    if (!driveFileId) {
      invalidNames.push(file.name);
      continue;
    }
    gcsByDriveId.set(driveFileId, {
      objectName: file.name,
      publicUrl: publicGcsUrl(bucketId, file.name),
    });
  }

  console.log(`GCS objects: ${videoFiles.length} (${gcsByDriveId.size} with valid drive ids)`);
  if (invalidNames.length > 0) {
    console.log(
      `Non-standard names (${invalidNames.length}) — must be story-hub/<google_drive_file_id>.mp4:`,
    );
    for (const n of invalidNames.slice(0, 25)) {
      console.log(`  ${n}`);
    }
    if (invalidNames.length > 25) {
      console.log(`  … and ${invalidNames.length - 25} more`);
    }
  }
  if (reportOnly) return;

  const pool = poolFor(databaseUrl);
  try {
    if (fixRename && invalidNames.length > 0) {
      await fixTitleNamedUploads({
        bucketId,
        storage,
        pool,
        invalidNames,
        dryRun,
        createMissing,
      });
      if (!dryRun) {
        console.log("\nRe-run without --fix-rename to verify drive-id mapping.");
      }
      return;
    }

    const { rows: activeStories } = await pool.query<StoryRow>(
      `select id, drive_file_id, title, gcs_url from story_content where active = true`,
    );

    const storyByDriveId = new Map(activeStories.map((s) => [s.drive_file_id, s]));

    let updated = 0;
    let alreadyMapped = 0;
    const missingInDb: string[] = [];
    let missingInGcs = 0;

    for (const [driveFileId, gcs] of gcsByDriveId) {
      const story = storyByDriveId.get(driveFileId);
      if (!story) {
        missingInDb.push(driveFileId);
        continue;
      }
      if (story.gcs_url === gcs.publicUrl) {
        alreadyMapped += 1;
        continue;
      }
      if (dryRun) {
        console.log(`[dry-run] would map ${story.title} (${driveFileId})`);
        updated += 1;
        continue;
      }
      await pool.query(
        `update story_content
         set gcs_url = $1, gcs_synced_at = now(), updated_at = now()
         where id = $2`,
        [gcs.publicUrl, story.id],
      );
      updated += 1;
    }

    for (const story of activeStories) {
      if (!gcsByDriveId.has(story.drive_file_id)) {
        missingInGcs += 1;
      }
    }

    const pending = await pool.query<{ count: string }>(
      `select count(*)::text as count from story_content where active = true and gcs_url is null`,
    );

    console.log("\n── Summary ──");
    console.log(`Mapped (new/updated): ${updated}${dryRun ? " (dry-run)" : ""}`);
    console.log(`Already correct:      ${alreadyMapped}`);
    console.log(`GCS without DB row:   ${missingInDb.length}`);
    console.log(`DB active, no GCS:    ${missingInGcs}`);
    console.log(`DB rows gcs_url null: ${pending.rows[0]?.count ?? 0}`);

    if (missingInDb.length > 0 && missingInDb.length <= 30) {
      console.log("\nGCS objects with no story_content row (run POST /api/stories/sync first):");
      for (const id of missingInDb.slice(0, 30)) {
        console.log(`  ${id}`);
      }
    } else if (missingInDb.length > 30) {
      console.log(`\nFirst 20 orphan GCS drive ids: ${missingInDb.slice(0, 20).join(", ")}`);
    }

    if (!dryRun && updated > 0) {
      console.log("\nDone. Playback: /api/stories/stream/<driveFileId> (no signed URLs needed).");
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
