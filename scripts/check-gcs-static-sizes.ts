import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Storage } from "@google-cloud/storage";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, "Amynest-backend-dykj.env"), override: true });

function parseRender(text: string, key: string) {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  let val = line.slice(line.indexOf("=") + 1).trim();
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

async function main() {
  let creds: Record<string, unknown> | null = null;
  try {
    creds = parseRender(
      readFileSync(resolve(root, "Amynest-backend-dykj.env"), "utf8"),
      "GCS_SERVICE_ACCOUNT_JSON",
    );
  } catch {
    /* ignore */
  }
  const bucketName =
    process.env.GCS_BUCKET_NAME ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ||
    "amynest-audio-storage";
  console.log("bucket", bucketName, "hasCreds", Boolean(creds));
  const storage = creds
    ? new Storage({
        credentials: creds as never,
        projectId: typeof creds.project_id === "string" ? creds.project_id : undefined,
      })
    : new Storage();

  const words = ["fox", "hello", "kid", "hop", "cat", "sat"];
  for (const w of words) {
    const hash = createHash("md5").update(`default\0${w}`).digest("hex");
    const file = storage.bucket(bucketName).file(`static-audio/${hash}.mp3`);
    const [exists] = await file.exists();
    if (!exists) {
      console.log(w, hash.slice(0, 8), "NOT_IN_GCS");
      continue;
    }
    const [meta] = await file.getMetadata();
    console.log(w, hash.slice(0, 8), `gcsBytes=${meta.size}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
