/**
 * Upload content-bank/ to GCS (DEFAULT_OBJECT_STORAGE_BUCKET_ID).
 *
 * Usage:
 *   pnpm run upload:content-bank
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import { REPO_ROOT } from "./static-audio-paths.js";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/.env.local`, override: true });
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

function walkFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full, base));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();
  if (!bucketId) {
    console.error("Missing DEFAULT_OBJECT_STORAGE_BUCKET_ID");
    process.exit(1);
  }

  const creds = loadGcsCredentials();
  if (!creds) {
    console.error("Missing GCS_SERVICE_ACCOUNT_JSON");
    process.exit(1);
  }

  const root = resolve(REPO_ROOT, "content-bank");
  const files = walkFiles(root).filter(
    (f) => f.endsWith(".json") || f.endsWith(".json.gz") || f.endsWith(".md"),
  );

  if (files.length === 0) {
    console.error(`No files in ${root}. Run pnpm run generate:content-bank first.`);
    process.exit(1);
  }

  const storage = new Storage({
    credentials: creds as never,
    projectId: String(creds.project_id ?? process.env.GCS_PROJECT_ID ?? ""),
  });
  const bucket = storage.bucket(bucketId);

  console.log(`Uploading ${files.length} files to gs://${bucketId}/content-bank/ …`);

  for (const filePath of files) {
    const rel = filePath.slice(root.length + 1);
    const objectName = `content-bank/${rel}`;
    const contentType = filePath.endsWith(".gz")
      ? "application/gzip"
      : filePath.endsWith(".md")
        ? "text/markdown"
        : "application/json";
    await bucket.upload(filePath, {
      destination: objectName,
      metadata: {
        contentType,
        cacheControl: "public, max-age=3600",
      },
    });
    console.log(`  ✓ ${objectName}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
