/**
 * GCS-native Art & Craft reels catalog (Phase 2A).
 * Playback bytes still use legacy Drive path until Phase 2B.
 */
import { z } from "zod";
import { readEnv } from "../lib/env";
import { logger } from "../lib/logger";
import {
  gcsObjectExists,
  legacyGcsConfigured,
  readGcsObjectBytes,
} from "./ttsAudioStore";

export const REELS_CATALOG_V1_GCS_PATH =
  readEnv("REELS_CATALOG_GCS_PATH")?.trim() || "reels-hub/phase1/catalog.v1.json";

export const REELS_PHASE1_OBJECT_PREFIX = "reels-hub/phase1/";

const REEL_ID_RE = /^[a-zA-Z0-9_-]+$/;

const catalogEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  objectKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  contentType: z.string().min(1),
  active: z.boolean(),
});

const catalogV1Schema = z.object({
  version: z.literal(1),
  prefix: z.string().min(1),
  generatedAt: z.string().optional(),
  entries: z.array(catalogEntrySchema).min(1),
});

export type ReelsCatalogEntry = z.infer<typeof catalogEntrySchema>;
export type ReelsCatalogV1 = z.infer<typeof catalogV1Schema>;

export type ReelsCatalogCertification = {
  ok: boolean;
  catalogPath: string;
  catalogEntries: number;
  activeEntries: number;
  duplicateIds: string[];
  invalidObjectReferences: Array<{ id: string; objectKey: string; reason: string }>;
  missingObjects: Array<{ id: string; objectKey: string }>;
  catalogIntegrityPercent: number;
  pass: boolean;
};

let cachedCatalog: ReelsCatalogV1 | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Human title from catalog id, e.g. artcraft-1 → Artcraft 1 */
export function titleFromReelId(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function resolveReelStreamPath(id: string): string {
  return `/api/reels/stream/${id}`;
}

function isValidObjectKey(objectKey: string, expectedPrefix = REELS_PHASE1_OBJECT_PREFIX): boolean {
  if (!objectKey.startsWith(expectedPrefix)) return false;
  if (objectKey.includes("..")) return false;
  if (!objectKey.toLowerCase().endsWith(".mp4")) return false;
  return true;
}

export function parseReelsCatalogV1(raw: unknown): ReelsCatalogV1 {
  return catalogV1Schema.parse(raw);
}

export function clearReelsCatalogCacheForTests(): void {
  cachedCatalog = null;
  cacheLoadedAt = 0;
}

export async function loadReelsCatalogV1(options?: {
  forceRefresh?: boolean;
}): Promise<ReelsCatalogV1> {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();
  if (!forceRefresh && cachedCatalog && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  if (!legacyGcsConfigured()) {
    throw new Error("gcs_not_configured");
  }

  const buffer = await readGcsObjectBytes(REELS_CATALOG_V1_GCS_PATH);
  if (!buffer) {
    throw new Error("catalog_not_found");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new Error("catalog_invalid_json");
  }

  const catalog = parseReelsCatalogV1(parsed);
  cachedCatalog = catalog;
  cacheLoadedAt = now;
  logger.info(
    { evt: "reels.catalog_loaded", path: REELS_CATALOG_V1_GCS_PATH, count: catalog.entries.length },
    "Reels catalog loaded from GCS",
  );
  return catalog;
}

export async function listActiveReelsForApi(options?: {
  shuffle?: boolean;
}): Promise<ReelsCatalogEntry[]> {
  const catalog = await loadReelsCatalogV1();
  const active = catalog.entries.filter((e) => e.active);
  if (options?.shuffle !== false) {
    const copy = [...active];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }
  return active;
}

/** Validate catalog schema + that every referenced GCS object exists. */
export async function certifyReelsCatalogV1(options?: {
  catalog?: ReelsCatalogV1;
  verifyObjects?: boolean;
}): Promise<ReelsCatalogCertification> {
  let catalog = options?.catalog;
  if (!catalog) {
    try {
      catalog = await loadReelsCatalogV1({ forceRefresh: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        catalogPath: REELS_CATALOG_V1_GCS_PATH,
        catalogEntries: 0,
        activeEntries: 0,
        duplicateIds: [],
        invalidObjectReferences: [{ id: "-", objectKey: "-", reason: message }],
        missingObjects: [],
        catalogIntegrityPercent: 0,
        pass: false,
      };
    }
  }

  const verifyObjects = options?.verifyObjects !== false && legacyGcsConfigured();
  const duplicateIds: string[] = [];
  const invalidObjectReferences: ReelsCatalogCertification["invalidObjectReferences"] = [];
  const missingObjects: ReelsCatalogCertification["missingObjects"] = [];
  const seenIds = new Set<string>();

  for (const entry of catalog.entries) {
    if (seenIds.has(entry.id)) duplicateIds.push(entry.id);
    seenIds.add(entry.id);

    if (!REEL_ID_RE.test(entry.id)) {
      invalidObjectReferences.push({
        id: entry.id,
        objectKey: entry.objectKey,
        reason: "invalid_id_format",
      });
    }

    if (!isValidObjectKey(entry.objectKey, catalog.prefix)) {
      invalidObjectReferences.push({
        id: entry.id,
        objectKey: entry.objectKey,
        reason: "invalid_object_key",
      });
    }

    const expectedKey = `${catalog.prefix}${entry.id}.mp4`;
    if (entry.objectKey !== expectedKey) {
      invalidObjectReferences.push({
        id: entry.id,
        objectKey: entry.objectKey,
        reason: `object_key_mismatch_expected_${expectedKey}`,
      });
    }

    if (entry.contentType !== "video/mp4") {
      invalidObjectReferences.push({
        id: entry.id,
        objectKey: entry.objectKey,
        reason: "invalid_content_type",
      });
    }

    if (verifyObjects) {
      const exists = await gcsObjectExists(entry.objectKey);
      if (!exists) {
        missingObjects.push({ id: entry.id, objectKey: entry.objectKey });
      }
    }
  }

  const entriesWithIssues = new Set([
    ...duplicateIds,
    ...invalidObjectReferences.map((r) => r.id),
    ...missingObjects.map((r) => r.id),
  ]);
  const catalogIntegrityPercent =
    catalog.entries.length > 0
      ? Math.round(
          ((catalog.entries.length - entriesWithIssues.size) / catalog.entries.length) * 10000,
        ) / 100
      : 0;

  const pass =
    catalog.entries.length > 0 &&
    duplicateIds.length === 0 &&
    invalidObjectReferences.length === 0 &&
    missingObjects.length === 0;

  return {
    ok: pass,
    catalogPath: REELS_CATALOG_V1_GCS_PATH,
    catalogEntries: catalog.entries.length,
    activeEntries: catalog.entries.filter((e) => e.active).length,
    duplicateIds: [...new Set(duplicateIds)],
    invalidObjectReferences,
    missingObjects,
    catalogIntegrityPercent,
    pass,
  };
}
