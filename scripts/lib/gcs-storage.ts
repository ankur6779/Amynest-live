/**
 * Shared GCS credential loading for discovery-worlds ops scripts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Storage } from "@google-cloud/storage";

export function getRepoRoot(fromDir: string): string {
  return join(fromDir, "..");
}

export function getGcsBucketName(): string {
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

export function tryParseJsonObject(raw: string): Record<string, unknown> | null {
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

export function loadGcsCredentialsFromRenderEnvFile(repoRoot: string): Record<string, unknown> | null {
  const envPath = join(repoRoot, "Amynest-backend-dykj.env");
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

export function buildGcsStorage(repoRoot: string): Storage {
  const fromFile = loadGcsCredentialsFromRenderEnvFile(repoRoot);
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

export function hasGcsCredentials(repoRoot: string): boolean {
  if (process.env.GCS_SERVICE_ACCOUNT_JSON?.trim()) return true;
  return loadGcsCredentialsFromRenderEnvFile(repoRoot) !== null;
}

export async function gcsObjectExists(
  storage: Storage,
  bucketId: string,
  gcsPath: string,
): Promise<boolean> {
  try {
    const [ok] = await storage.bucket(bucketId).file(gcsPath).exists();
    return ok;
  } catch {
    return false;
  }
}

export async function downloadGcsObject(
  storage: Storage,
  bucketId: string,
  gcsPath: string,
): Promise<Buffer | null> {
  try {
    const [buf] = await storage.bucket(bucketId).file(gcsPath).download();
    return buf;
  } catch {
    return null;
  }
}
