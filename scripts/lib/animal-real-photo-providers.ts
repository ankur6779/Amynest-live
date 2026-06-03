/**
 * Multi-source animal photo discovery (priority: Wikimedia → iNaturalist → Unsplash → Pexels).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { HERO_WIDTH, HERO_HEIGHT } from "./discovery-visual-render.js";
import { validateSourceImageBuffer } from "./animal-real-photo-validate.js";

export type PhotoSource = "wikimedia" | "inaturalist" | "unsplash" | "pexels";

export type PhotoFetchResult = {
  url: string;
  source: PhotoSource;
  buffer: Buffer;
};

export type FailureReason =
  | "wikimedia_rate_limit"
  | "page_not_found"
  | "image_not_found"
  | "invalid_image"
  | "conversion_failed"
  | "download_failed"
  | "unknown";

const UA = "AmyNestAnimalWorld/1.0 (contact@amynest.in; +https://www.amynest.in)";

let mappingsCache: Record<string, string> | null = null;
let taxonHintsCache: Record<string, number> | null = null;

export function loadPhotoMappings(): Record<string, string> {
  if (mappingsCache) return mappingsCache;
  const path = join(dirname(fileURLToPath(import.meta.url)), "../data/animal-world-photo-mappings.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    mappings: Record<string, string>;
    taxonIdHints?: Record<string, number>;
  };
  mappingsCache = raw.mappings;
  taxonHintsCache = raw.taxonIdHints ?? {};
  return mappingsCache;
}

export function taxonIdHint(animalId: string): number | undefined {
  loadPhotoMappings();
  return taxonHintsCache?.[animalId];
}

export function searchTermFor(animalId: string, animalName: string): string {
  const mappings = loadPhotoMappings();
  return mappings[animalId] ?? animalName;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function classifyError(err: unknown, httpStatus?: number): FailureReason {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (httpStatus === 429 || msg.includes("rate_limit") || msg.includes("too many requests")) {
    return "wikimedia_rate_limit";
  }
  if (httpStatus === 404 || msg.includes("not_found") || msg.includes("no photo") || msg.includes("no_commons")) {
    return "page_not_found";
  }
  if (msg.includes("no image") || msg.includes("image_not_found")) return "image_not_found";
  if (httpStatus && httpStatus >= 400 && httpStatus < 500) return "download_failed";
  if (msg.includes("http 4") || msg.includes("http 5") || msg.includes("download")) return "download_failed";
  if (msg.includes("invalid_image") || msg.includes("dimensions") || msg.includes("blank") || msg.includes("too_small")) {
    return "invalid_image";
  }
  if (msg.includes("sharp") || msg.includes("conversion") || msg.includes("metadata")) {
    return "conversion_failed";
  }
  return "unknown";
}

async function fetchWithBackoff(url: string, init?: RequestInit, attempts = 5): Promise<Response> {
  let delay = 1200;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, ...(init?.headers as Record<string, string>) },
    });
    if (res.status === 429) {
      await sleep(delay);
      delay = Math.min(delay * 2, 60_000);
      continue;
    }
    return res;
  }
  throw new Error("wikimedia_rate_limit");
}

async function downloadValidated(url: string): Promise<Buffer> {
  const res = await fetchWithBackoff(url, { signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw Object.assign(new Error(`download HTTP ${res.status}`), { status: res.status });
  const buf = Buffer.from(await res.arrayBuffer());
  const v = await validateSourceImageBuffer(buf);
  if (!v.ok) {
    throw new Error(`invalid_image: ${v.detail ?? v.failureReason}`);
  }
  return buf;
}

async function findWikimedia(animalId: string, animalName: string): Promise<string | null> {
  const term = searchTermFor(animalId, animalName);

  for (const q of [`${term}`, `${term} animal`, `${term} wildlife`, `File:${term}.jpg`]) {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: q,
      gsrnamespace: "6",
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "1200",
      format: "json",
      origin: "*",
    });
    try {
      const res = await fetchWithBackoff(`https://commons.wikimedia.org/w/api.php?${params}`, {
        signal: AbortSignal.timeout(25_000) },
      );
      if (res.status === 429) throw new Error("wikimedia_rate_limit");
      if (!res.ok) continue;
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ url?: string; thumburl?: string }> }> };
      };
      for (const page of Object.values(data.query?.pages ?? {})) {
        const title = page.title ?? "";
        if (/logo|icon|\.svg|map|diagram|flag|coat|skull|fossil/i.test(title)) continue;
        const url = page.imageinfo?.[0]?.url ?? page.imageinfo?.[0]?.thumburl;
        if (url) return url;
      }
    } catch (e) {
      if (classifyError(e) === "wikimedia_rate_limit") throw e;
    }
  }
  return null;
}

function inaturalistLargeUrl(photo: {
  id?: number;
  url?: string;
  original_dimensions?: { width?: number; height?: number };
}): string | null {
  const w = photo.original_dimensions?.width ?? 0;
  const h = photo.original_dimensions?.height ?? 0;
  if (w < 800 || h < 600) return null;
  if (photo.url) {
    const large = photo.url
      .replace("/square.", "/large.")
      .replace("/medium.", "/large.")
      .replace(/square\.(jpe?g|png|webp)/i, "large.$1");
    if (large !== photo.url) return large;
  }
  if (!photo.id) return null;
  return `https://inaturalist-open-data.s3.amazonaws.com/photos/${photo.id}/large.jpeg`;
}

async function photosForTaxon(taxonId: number): Promise<string | null> {
  const obsRes = await fetch(
    `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&photos=true&quality_grade=research&photo_license=cc0,cc-by,cc-by-sa&order=desc&order_by=votes&per_page=20`,
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) },
  );
  if (!obsRes.ok) return null;
  const obs = (await obsRes.json()) as {
    results?: Array<{
      photos?: Array<{
        id?: number;
        url?: string;
        original_dimensions?: { width?: number; height?: number };
      }>;
    }>;
  };
  for (const o of obs.results ?? []) {
    for (const p of o.photos ?? []) {
      const url = inaturalistLargeUrl(p);
      if (url) return url;
    }
  }
  return null;
}

async function findINaturalist(animalId: string, animalName: string): Promise<string | null> {
  const hint = taxonIdHint(animalId);
  if (hint) {
    const direct = await photosForTaxon(hint);
    if (direct) return direct;
  }

  const q = searchTermFor(animalId, animalName);
  const taxonRes = await fetch(
    `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=10`,
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) },
  );
  if (!taxonRes.ok) return null;
  const taxa = (await taxonRes.json()) as {
    results?: Array<{ id: number; iconic_taxon_name?: string }>;
  };
  const candidates =
    taxa.results?.filter((t) => t.iconic_taxon_name === "Animalia") ?? taxa.results ?? [];
  for (const taxon of candidates.slice(0, 5)) {
    if (!taxon?.id) continue;
    const url = await photosForTaxon(taxon.id);
    if (url) return url;
  }
  return null;
}

async function findUnsplash(animalId: string, animalName: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return null;
  const q = `${searchTermFor(animalId, animalName)} animal wildlife`;
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=3&orientation=portrait`,
    { headers: { Authorization: `Client-ID ${key}`, "User-Agent": UA }, signal: AbortSignal.timeout(20_000) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string; full?: string } }> };
  return data.results?.[0]?.urls?.regular ?? data.results?.[0]?.urls?.full ?? null;
}

async function findPexels(animalId: string, animalName: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return null;
  const q = `${searchTermFor(animalId, animalName)} animal`;
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=3&orientation=portrait`,
    { headers: { Authorization: key, "User-Agent": UA }, signal: AbortSignal.timeout(20_000) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { photos?: Array<{ src?: { large2x?: string; large?: string } }> };
  return data.photos?.[0]?.src?.large2x ?? data.photos?.[0]?.src?.large ?? null;
}

export async function fetchAnimalPhotoFromProviders(
  animalId: string,
  animalName: string,
  options?: { wikimediaOnly?: boolean; skipWikimedia?: boolean },
): Promise<PhotoFetchResult> {
  const providers: Array<{ source: PhotoSource; find: () => Promise<string | null> }> = [];
  if (!options?.skipWikimedia) {
    providers.push({ source: "wikimedia", find: () => findWikimedia(animalId, animalName) });
  }
  if (!options?.wikimediaOnly) {
    providers.push(
      { source: "inaturalist", find: () => findINaturalist(animalId, animalName) },
      { source: "unsplash", find: () => findUnsplash(animalId, animalName) },
      { source: "pexels", find: () => findPexels(animalId, animalName) },
    );
  }

  let lastReason: FailureReason = "unknown";
  for (const { source, find } of providers) {
    try {
      const url = await find();
      if (!url) {
        lastReason = "image_not_found";
        continue;
      }
      const buffer = await downloadValidated(url);
      return { url, source, buffer };
    } catch (e) {
      lastReason = classifyError(e, (e as { status?: number }).status);
      if (lastReason === "wikimedia_rate_limit" && source === "wikimedia") {
        throw e;
      }
    }
  }
  throw new Error(lastReason);
}

export async function renderHeroRealWebp(sourceBuffer: Buffer): Promise<Buffer> {
  return sharp(sourceBuffer)
    .resize(HERO_WIDTH, HERO_HEIGHT, { fit: "cover", position: "centre" })
    .webp({ quality: 88, effort: 4 })
    .toBuffer();
}
