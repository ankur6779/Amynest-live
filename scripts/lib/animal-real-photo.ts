/**
 * Fetch CC-licensed animal photos (Wikipedia summary + Wikimedia Commons fallback).
 */
import sharp from "sharp";
import { HERO_WIDTH, HERO_HEIGHT } from "./discovery-visual-render.js";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, init?: RequestInit, attempts = 4): Promise<Response> {
  const headers = { "User-Agent": "AmyNestAnimalWorld/1.0 (contact@amynest.in)", ...(init?.headers as Record<string, string>) };
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { ...init, headers });
    if (res.status === 429) {
      await sleep(8000 * (i + 1));
      continue;
    }
    return res;
  }
  throw new Error("rate_limited");
}

const SEARCH_OVERRIDES: Record<string, string> = {
  cow: "Holstein cattle",
  dog: "Dog",
  cat: "Cat",
  lion: "Lion",
  elephant: "African elephant",
  bear: "Brown bear",
  wolf: "Gray wolf",
  fox: "Red fox",
  dolphin: "Common dolphin",
  whale: "Blue whale",
  shark: "Great white shark",
  penguin: "Emperor penguin",
  "polar-bear": "Polar bear",
  "sea-turtle": "Green sea turtle",
  "guinea-pig": "Guinea pig",
  "goldfish": "Goldfish",
  goose: "Greylag goose",
  llama: "Llama",
  "seal-arctic": "Harbor seal",
  muskox: "Muskox",
};

async function findWikipediaThumbnail(animalName: string, animalId: string): Promise<string | null> {
  const titles = [
    SEARCH_OVERRIDES[animalId],
    animalName,
    `${animalName} (animal)`,
  ].filter(Boolean) as string[];

  for (const title of titles) {
    try {
      const res = await fetchWithRetry(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { thumbnail?: { source?: string } };
      const url = data.thumbnail?.source;
      if (url && /^https:\/\//.test(url)) {
        return url.replace(/\/(\d+)px-/, "/800px-");
      }
    } catch {
      /* try next title */
    }
  }
  return null;
}

export async function findCommonsPhotoUrl(animalName: string, animalId: string): Promise<string | null> {
  const wiki = await findWikipediaThumbnail(animalName, animalId);
  if (wiki) return wiki;

  const query = SEARCH_OVERRIDES[animalId] ?? animalName;
  const searches = [`${query}`, `${query} animal photograph`, `Category:${query}`];

  for (const term of searches) {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: term,
      gsrnamespace: "6",
      gsrlimit: "10",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "800",
      format: "json",
      origin: "*",
    });
    try {
      const res = await fetchWithRetry(`https://commons.wikimedia.org/w/api.php?${params}`, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; url?: string }> }> };
      };
      for (const page of Object.values(data.query?.pages ?? {})) {
        const title = page.title ?? "";
        if (/logo|icon|\.svg|map|diagram|flag|coat of arms/i.test(title)) continue;
        const url = page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url;
        if (url && /^https:\/\//.test(url)) return url;
      }
    } catch {
      /* next search */
    }
  }
  return null;
}

export async function renderRealHeroWebp(imageUrl: string): Promise<Buffer> {
  const res = await fetchWithRetry(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Photo HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  return sharp(input)
    .resize(HERO_WIDTH, HERO_HEIGHT, { fit: "cover", position: "centre" })
    .webp({ quality: 86, effort: 4 })
    .toBuffer();
}
