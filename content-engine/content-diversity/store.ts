import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DiversityFingerprint } from "./types.js";
import { CONTENT_DIVERSITY_VERSION, RECENT_WINDOW } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DIVERSITY_STORE_PATH = join(
  HERE,
  "data",
  "content-diversity-store.json",
);

interface DiversityStoreSnapshot {
  version: string;
  fingerprints: DiversityFingerprint[];
  updatedAt: string;
}

export function loadDiversityStore(
  path: string = DEFAULT_DIVERSITY_STORE_PATH,
): DiversityStoreSnapshot {
  if (!existsSync(path)) {
    return {
      version: CONTENT_DIVERSITY_VERSION,
      fingerprints: [],
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as DiversityStoreSnapshot;
    return {
      version: CONTENT_DIVERSITY_VERSION,
      fingerprints: Array.isArray(raw.fingerprints) ? raw.fingerprints : [],
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return {
      version: CONTENT_DIVERSITY_VERSION,
      fingerprints: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

export function saveDiversityStore(
  snapshot: DiversityStoreSnapshot,
  path: string = DEFAULT_DIVERSITY_STORE_PATH,
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      {
        ...snapshot,
        version: CONTENT_DIVERSITY_VERSION,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

export function recentFingerprints(
  path: string = DEFAULT_DIVERSITY_STORE_PATH,
  limit = RECENT_WINDOW,
): DiversityFingerprint[] {
  const store = loadDiversityStore(path);
  return [...store.fingerprints]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function rememberFingerprint(
  fingerprint: DiversityFingerprint,
  path: string = DEFAULT_DIVERSITY_STORE_PATH,
): void {
  const store = loadDiversityStore(path);
  const next = [
    fingerprint,
    ...store.fingerprints.filter((f) => f.id !== fingerprint.id),
  ].slice(0, 200);
  saveDiversityStore({ ...store, fingerprints: next }, path);
}
