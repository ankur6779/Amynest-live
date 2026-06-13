/**
 * Build and upload reels-hub/phase1/catalog.v1.json from GCS MP4 objects.
 *
 * Usage:
 *   pnpm run generate:reels-catalog              # upload to GCS
 *   pnpm run generate:reels-catalog -- --dry-run # write local JSON only
 *   pnpm run generate:reels-catalog -- --certify # upload + integrity report
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  buildGcsStorage,
  getGcsBucketName,
  hasGcsCredentials,
} from "./lib/gcs-storage.js";
import { REPO_ROOT } from "./static-audio-paths.js";

const PREFIX = "reels-hub/phase1/";
const CATALOG_OBJECT_KEY = "reels-hub/phase1/catalog.v1.json";
const LOCAL_OUT = join(REPO_ROOT, "content-bank/reels/phase1/catalog.v1.json");

function titleFromReelId(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const certify = process.argv.includes("--certify");
  return { dryRun, certify };
}

async function listPhase1Mp4Objects() {
  const storage = buildGcsStorage(REPO_ROOT);
  const bucketId = getGcsBucketName();
  const bucket = storage.bucket(bucketId);
  const objects: Array<{
    id: string;
    objectKey: string;
    sizeBytes: number;
    contentType: string;
  }> = [];

  let pageToken: string | undefined;
  do {
    const [files, , apiResponse] = await bucket.getFiles({
      prefix: PREFIX,
      maxResults: 1000,
      autoPaginate: false,
      pageToken,
    });
    for (const file of files) {
      if (file.name === CATALOG_OBJECT_KEY) continue;
      if (!file.name.toLowerCase().endsWith(".mp4")) continue;
      const stem = file.name.slice(PREFIX.length).replace(/\.mp4$/i, "");
      if (!stem || stem === "catalog.v1") continue;
      const [meta] = await file.getMetadata();
      objects.push({
        id: stem,
        objectKey: file.name,
        sizeBytes: Number(meta.size ?? 0),
        contentType: (meta.contentType as string) || "video/mp4",
      });
    }
    pageToken = (apiResponse as { nextPageToken?: string } | undefined)?.nextPageToken;
  } while (pageToken);

  objects.sort((a, b) => {
    const na = Number(a.id.match(/(\d+)$/)?.[1] ?? NaN);
    const nb = Number(b.id.match(/(\d+)$/)?.[1] ?? NaN);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });

  return { storage, bucketId, objects };
}

async function certifyCatalog(
  storage: ReturnType<typeof buildGcsStorage>,
  bucketId: string,
  entries: Array<{ id: string; objectKey: string }>,
) {
  const duplicateIds: string[] = [];
  const missingObjects: Array<{ id: string; objectKey: string }> = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.id)) duplicateIds.push(entry.id);
    seen.add(entry.id);
    const [exists] = await storage.bucket(bucketId).file(entry.objectKey).exists();
    if (!exists) missingObjects.push({ id: entry.id, objectKey: entry.objectKey });
  }

  const issueCount = duplicateIds.length + missingObjects.length;
  const integrityPercent =
    entries.length > 0
      ? Math.round(((entries.length - issueCount) / entries.length) * 10000) / 100
      : 0;

  return {
    catalogEntries: entries.length,
    duplicateIds: [...new Set(duplicateIds)],
    missingObjects,
    catalogIntegrityPercent: integrityPercent,
    pass: entries.length > 0 && issueCount === 0,
  };
}

async function main() {
  const { dryRun, certify } = parseArgs();

  if (!hasGcsCredentials(REPO_ROOT)) {
    console.error("GCS credentials missing — set GCS_SERVICE_ACCOUNT_JSON or Amynest-backend-dykj.env");
    process.exit(2);
  }

  console.error("Listing GCS objects under", PREFIX);
  const { storage, bucketId, objects } = await listPhase1Mp4Objects();
  console.error(`Found ${objects.length} MP4 objects`);

  const catalog = {
    version: 1 as const,
    prefix: PREFIX,
    generatedAt: new Date().toISOString(),
    entries: objects.map((o) => ({
      id: o.id,
      title: titleFromReelId(o.id),
      objectKey: o.objectKey,
      sizeBytes: o.sizeBytes,
      contentType: "video/mp4",
      active: true,
    })),
  };

  const json = `${JSON.stringify(catalog, null, 2)}\n`;
  mkdirSync(dirname(LOCAL_OUT), { recursive: true });
  writeFileSync(LOCAL_OUT, json, "utf8");
  console.error("Wrote local copy:", LOCAL_OUT);

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, catalogEntries: catalog.entries.length, localOut: LOCAL_OUT }, null, 2));
    return;
  }

  await storage.bucket(bucketId).file(CATALOG_OBJECT_KEY).save(json, {
    contentType: "application/json",
    metadata: {
      cacheControl: "public, max-age=300",
    },
  });
  console.error("Uploaded:", `gs://${bucketId}/${CATALOG_OBJECT_KEY}`);

  const report = await certifyCatalog(storage, bucketId, catalog.entries);
  const output = {
    uploaded: true,
    catalogPath: `gs://${bucketId}/${CATALOG_OBJECT_KEY}`,
    ...report,
  };
  console.log(JSON.stringify(output, null, 2));

  if (certify && !report.pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
