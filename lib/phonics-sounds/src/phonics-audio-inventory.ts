/**
 * Master phonics audio inventory — every asset that must exist in GCS before playback.
 * Core curriculum + optional extended items from V1/V2/V3 content collectors.
 */
import {
  buildPhonicsAudioCatalog,
  type PhonicsCatalogEntry,
} from "./audio-catalog.js";
import {
  getPhonicsCatalogKey,
  getPhonicsGcsObjectPath,
  type PhonicsAssetType,
} from "./gcs-paths.js";

export type PhonicsInventoryCategory =
  | "phoneme"
  | "letter"
  | "word"
  | "blend"
  | "digraph"
  | "cvc"
  | "cvcc"
  | "ccvc"
  | "sight_word"
  | "story_sentence"
  | "story_title"
  | "comprehension"
  | "mission_prompt"
  | "assessment_prompt"
  | "quiz"
  | "retention"
  | "recommendation";

export type PhonicsInventoryItem = {
  /** Human-readable text spoken by TTS */
  item: string;
  category: PhonicsInventoryCategory;
  /** Catalog asset type for GCS path */
  type: PhonicsAssetType;
  /** Stable catalog id */
  id: string;
  sourceFile: string;
  catalogKey: string;
  gcsPath: string;
  speakText: string;
  isolatedPhoneme: boolean;
};

function slugId(text: string, prefix = ""): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
  return prefix ? `${prefix}_${base}` : base;
}

function categoryToAssetType(category: PhonicsInventoryItem["category"]): PhonicsAssetType {
  if (category === "phoneme" || category === "letter") return "letter";
  if (category === "digraph") return "digraph";
  if (category === "blend") return "blend";
  if (category === "sight_word") return "sight_word";
  if (category === "quiz" || category === "mission_prompt" || category === "assessment_prompt" || category === "comprehension" || category === "recommendation") {
    return "quiz";
  }
  if (category === "story_sentence" || category === "story_title" || category === "retention") {
    return "sentence";
  }
  return "cvc";
}

export function catalogEntryToInventoryItem(
  entry: PhonicsCatalogEntry,
  sourceFile = "audio-catalog.ts",
): PhonicsInventoryItem {
  const category: PhonicsInventoryCategory =
    entry.type === "letter"
      ? "letter"
      : entry.type === "digraph"
        ? "digraph"
        : entry.type === "blend"
          ? "blend"
          : entry.type === "sight_word"
            ? "sight_word"
            : entry.type === "sentence"
              ? "story_sentence"
              : entry.type === "quiz"
                ? "quiz"
                : "cvc";

  const catalogKey = getPhonicsCatalogKey(entry.type, entry.id);
  return {
    item: entry.text,
    category,
    type: entry.type,
    id: entry.id,
    sourceFile,
    catalogKey,
    gcsPath: getPhonicsGcsObjectPath(entry.type, entry.id),
    speakText: entry.speakText,
    isolatedPhoneme: entry.isolatedPhoneme,
  };
}

export function makeInventoryItem(opts: {
  text: string;
  category: PhonicsInventoryCategory;
  sourceFile: string;
  id?: string;
  type?: PhonicsAssetType;
  speakText?: string;
  isolatedPhoneme?: boolean;
}): PhonicsInventoryItem {
  const type = opts.type ?? categoryToAssetType(opts.category);
  const id =
    opts.id ??
    (type === "sentence"
      ? slugId(opts.text)
      : type === "quiz"
        ? slugId(opts.text, "quiz")
        : slugId(opts.text));
  const catalogKey = getPhonicsCatalogKey(type, id);
  return {
    item: opts.text,
    category: opts.category,
    type,
    id,
    sourceFile: opts.sourceFile,
    catalogKey,
    gcsPath: getPhonicsGcsObjectPath(type, id),
    speakText: opts.speakText ?? opts.text,
    isolatedPhoneme: opts.isolatedPhoneme ?? false,
  };
}

export function buildCorePhonicsInventory(): PhonicsInventoryItem[] {
  return buildPhonicsAudioCatalog().map((e) => catalogEntryToInventoryItem(e));
}

/** Merge extended items; dedupe by catalogKey (first source wins). */
export function mergePhonicsInventory(
  core: PhonicsInventoryItem[],
  extended: PhonicsInventoryItem[],
): PhonicsInventoryItem[] {
  const map = new Map<string, PhonicsInventoryItem>();
  for (const item of core) map.set(item.catalogKey, item);
  for (const item of extended) {
    if (!map.has(item.catalogKey)) map.set(item.catalogKey, item);
  }
  return [...map.values()].sort((a, b) => a.catalogKey.localeCompare(b.catalogKey));
}

export function inventoryToCatalogEntries(items: PhonicsInventoryItem[]): PhonicsCatalogEntry[] {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    text: item.item,
    speakText: item.speakText,
    isolatedPhoneme: item.isolatedPhoneme,
    curriculumLevel: 4,
    difficulty: 3,
  }));
}

/** Full catalog for generation / certification (core + registered extensions). */
let _extendedProviders: Array<() => PhonicsInventoryItem[]> = [];

export function registerPhonicsAudioInventoryProvider(provider: () => PhonicsInventoryItem[]): void {
  _extendedProviders.push(provider);
}

export function resetPhonicsAudioInventoryProvidersForTests(): void {
  _extendedProviders = [];
}

export function buildFullPhonicsAudioInventory(): PhonicsInventoryItem[] {
  const core = buildCorePhonicsInventory();
  const extended = _extendedProviders.flatMap((fn) => fn());
  return mergePhonicsInventory(core, extended);
}

export function buildFullPhonicsAudioCatalog(): PhonicsCatalogEntry[] {
  return inventoryToCatalogEntries(buildFullPhonicsAudioInventory());
}

export type PhonicsAudioAuditReport = {
  totalAssets: number;
  audioAvailable: number;
  audioMissing: number;
  duplicateKeys: string[];
  orphanKeys: string[];
  missing: Array<{
    item: string;
    category: PhonicsInventoryCategory;
    sourceFile: string;
    catalogKey: string;
    gcsPath: string;
  }>;
  coveragePct: number;
  runtimeTtsRequired: number;
};

export function auditPhonicsInventoryAgainstManifest(
  inventory: PhonicsInventoryItem[],
  manifestAssets: Record<string, { url?: string; gcsPath?: string }> | undefined,
): PhonicsAudioAuditReport {
  const missing: PhonicsAudioAuditReport["missing"] = [];
  let audioAvailable = 0;

  for (const item of inventory) {
    const asset = manifestAssets?.[item.catalogKey];
    const url = asset?.url?.trim() ?? "";
    const hasUrl =
      url.startsWith("https://") || url.startsWith("/api/phonics-library/");
    if (hasUrl) audioAvailable += 1;
    else {
      missing.push({
        item: item.item,
        category: item.category,
        sourceFile: item.sourceFile,
        catalogKey: item.catalogKey,
        gcsPath: item.gcsPath,
      });
    }
  }

  const inventoryKeys = new Set(inventory.map((i) => i.catalogKey));
  const duplicateKeys: string[] = [];
  const urlToKeys = new Map<string, string[]>();
  for (const item of inventory) {
    const asset = manifestAssets?.[item.catalogKey];
    if (asset?.url) {
      const list = urlToKeys.get(asset.url) ?? [];
      list.push(item.catalogKey);
      urlToKeys.set(asset.url, list);
    }
  }
  for (const [, keys] of urlToKeys) {
    if (keys.length > 1) duplicateKeys.push(...keys);
  }

  const orphanKeys = manifestAssets
    ? Object.keys(manifestAssets).filter((k) => !inventoryKeys.has(k))
    : [];

  const dupInInventory = new Map<string, number>();
  for (const item of inventory) {
    dupInInventory.set(item.catalogKey, (dupInInventory.get(item.catalogKey) ?? 0) + 1);
  }
  for (const [key, count] of dupInInventory) {
    if (count > 1) duplicateKeys.push(key);
  }

  const total = inventory.length;
  const audioMissing = missing.length;
  const coveragePct = total > 0 ? Math.round((audioAvailable / total) * 10000) / 100 : 0;

  return {
    totalAssets: total,
    audioAvailable,
    audioMissing,
    duplicateKeys: [...new Set(duplicateKeys)],
    orphanKeys,
    missing,
    coveragePct,
    runtimeTtsRequired: audioMissing,
  };
}
