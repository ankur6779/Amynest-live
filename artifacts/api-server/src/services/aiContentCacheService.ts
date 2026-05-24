import { createHash } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, aiContentCacheTable } from "@workspace/db";

export type AiContentNamespace =
  | "smart_study"
  | "olympiad"
  | "spelling"
  | "phonics"
  | "life_skills";

/** Deterministic lookup key from shareable params (no userId / excludeIds). */
export function buildAiContentLookupKey(
  namespace: AiContentNamespace,
  parts: Record<string, string | number | boolean>,
): string {
  const seg = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(":");
  return `${namespace}:${seg}`;
}

export function contentItemId(raw: unknown): string | null {
  if (raw && typeof raw === "object" && "id" in raw) {
    const id = (raw as { id: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  if (typeof raw === "string") return raw;
  return null;
}

function itemDedupeKey(raw: unknown): string {
  if (typeof raw === "string") return raw.toLowerCase();
  try {
    return createHash("sha256").update(JSON.stringify(raw)).digest("hex").slice(0, 32);
  } catch {
    return String(raw);
  }
}

/** Pull unseen items from the shared pool for this lookup key. */
export async function fetchCachedItems<T>(opts: {
  namespace: AiContentNamespace;
  lookupKey: string;
  excludeIds: Set<string>;
  count: number;
  getId?: (item: T) => string | null;
}): Promise<{ items: T[]; fromCache: boolean; batchIds: string[] }> {
  const rows = await db
    .select()
    .from(aiContentCacheTable)
    .where(
      and(
        eq(aiContentCacheTable.namespace, opts.namespace),
        eq(aiContentCacheTable.lookupKey, opts.lookupKey),
      ),
    )
    .orderBy(desc(aiContentCacheTable.createdAt))
    .limit(30);

  const seenContent = new Set<string>();
  const out: T[] = [];
  const batchIds: string[] = [];

  for (const row of rows) {
    const batch = Array.isArray(row.items) ? (row.items as T[]) : [];
    for (const item of batch) {
      const id = opts.getId?.(item) ?? contentItemId(item);
      const dedupe = id ?? itemDedupeKey(item);
      if (seenContent.has(dedupe)) continue;
      if (id && opts.excludeIds.has(id)) continue;
      seenContent.add(dedupe);
      out.push(item);
      if (out.length >= opts.count) break;
    }
    if (out.length >= opts.count) {
      batchIds.push(row.id);
      break;
    }
    if (batch.length > 0) batchIds.push(row.id);
    if (out.length >= opts.count) break;
  }

  if (batchIds.length > 0) {
    await db
      .update(aiContentCacheTable)
      .set({ hitCount: sql`${aiContentCacheTable.hitCount} + 1` })
      .where(inArray(aiContentCacheTable.id, batchIds));
  }

  return {
    items: out.slice(0, opts.count),
    fromCache: out.length > 0,
    batchIds,
  };
}

export async function saveCachedItems(opts: {
  namespace: AiContentNamespace;
  lookupKey: string;
  items: unknown[];
  source?: "ai" | "fallback";
}): Promise<void> {
  if (!opts.items.length) return;
  await db.insert(aiContentCacheTable).values({
    namespace: opts.namespace,
    lookupKey: opts.lookupKey,
    items: opts.items,
    source: opts.source ?? "ai",
  });
}
