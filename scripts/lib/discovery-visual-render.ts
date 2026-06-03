/**
 * Programmatic discovery-world hero/card/thumbnail WebP (Twemoji + gradient).
 * Matches UI aspect 320×400 and DiscoveryHeroFallback polish.
 */
import sharp from "sharp";

export const HERO_WIDTH = 320;
export const HERO_HEIGHT = 400;
export const THUMB_WIDTH = 160;
export const THUMB_HEIGHT = 200;

const CATEGORY_PALETTE: Record<string, { from: string; to: string }> = {
  farm: { from: "#22c55e", to: "#2563eb" },
  wild: { from: "#f59e0b", to: "#dc2626" },
  birds: { from: "#38bdf8", to: "#6366f1" },
  sea: { from: "#06b6d4", to: "#3b82f6" },
  pets: { from: "#a855f7", to: "#ec4899" },
  insects: { from: "#84cc16", to: "#eab308" },
  road: { from: "#64748b", to: "#475569" },
  sky: { from: "#38bdf8", to: "#818cf8" },
  water: { from: "#0ea5e9", to: "#14b8a6" },
  work: { from: "#f97316", to: "#ca8a04" },
  weather: { from: "#60a5fa", to: "#94a3b8" },
  forest: { from: "#16a34a", to: "#14532d" },
  kitchen: { from: "#fb923c", to: "#f43f5e" },
  bathroom: { from: "#67e8f9", to: "#6366f1" },
  bedroom: { from: "#c4b5fd", to: "#f472b6" },
  living: { from: "#fcd34d", to: "#f97316" },
  strings: { from: "#f472b6", to: "#8b5cf6" },
  keys: { from: "#94a3b8", to: "#6366f1" },
  percussion: { from: "#fbbf24", to: "#ef4444" },
  wind: { from: "#7dd3fc", to: "#4ade80" },
};

const DEFAULT_PALETTE = { from: "#4f46e5", to: "#d97706" };

const twemojiCache = new Map<string, Buffer>();

/** Twemoji asset filename from emoji grapheme(s). */
export function emojiToTwemojiCodepoints(emoji: string): string {
  const parts: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0xfe0f) continue;
    parts.push(cp.toString(16));
  }
  return parts.join("-");
}

export function paletteForCategory(category: string): { from: string; to: string } {
  const key = category.trim().toLowerCase();
  return CATEGORY_PALETTE[key] ?? DEFAULT_PALETTE;
}

function twemojiUrlCandidates(emoji: string): string[] {
  const bases = [
    emojiToTwemojiCodepoints(emoji),
    ...emoji.split("\u200d").map((part) => emojiToTwemojiCodepoints(part.trim())).filter(Boolean),
  ];
  const urls = new Set<string>();
  for (const cp of bases) {
    if (cp) urls.add(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cp}.png`);
  }
  return [...urls];
}

async function fetchTwemojiFromUrl(url: string): Promise<Buffer> {
  const cached = twemojiCache.get(url);
  if (cached) return cached;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Twemoji HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  twemojiCache.set(url, buf);
  return buf;
}

/** Raster emoji via SVG text when Twemoji has no asset (ZWJ / newer sequences). */
async function fetchEmojiSvgRaster(emoji: string, size: number): Promise<Buffer> {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <text x="50%" y="54%" font-size="${Math.round(size * 0.82)}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>`;
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

export async function fetchTwemojiPng(emoji: string): Promise<Buffer> {
  let lastErr = "no candidate";
  for (const url of twemojiUrlCandidates(emoji)) {
    try {
      return await fetchTwemojiFromUrl(url);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  try {
    return await fetchEmojiSvgRaster(emoji, 72);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Twemoji fetch failed for ${emoji}: ${lastErr}; svg fallback: ${msg}`);
  }
}

async function gradientBackground(from: string, to: string): Promise<Buffer> {
  const svg = `<svg width="${HERO_WIDTH}" height="${HERO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <ellipse cx="160" cy="210" rx="130" ry="150" fill="white" opacity="0.14"/>
  <ellipse cx="160" cy="200" rx="95" ry="95" fill="white" opacity="0.08"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderHeroWebp(emoji: string, category: string): Promise<Buffer> {
  const { from, to } = paletteForCategory(category);
  const emojiSize = 168;
  const emojiPng = await fetchTwemojiPng(emoji);
  const resizedEmoji = await sharp(emojiPng).resize(emojiSize, emojiSize, { fit: "contain" }).png().toBuffer();
  const bg = await gradientBackground(from, to);
  const top = Math.round((HERO_HEIGHT - emojiSize) / 2);
  const left = Math.round((HERO_WIDTH - emojiSize) / 2);
  return sharp(bg)
    .composite([{ input: resizedEmoji, top, left }])
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
}

export async function renderCardWebp(heroWebp: Buffer): Promise<Buffer> {
  return sharp(heroWebp)
    .modulate({ brightness: 1.1, saturation: 1.18 })
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
}

export async function renderThumbnailWebp(heroWebp: Buffer): Promise<Buffer> {
  return sharp(heroWebp)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover", position: "centre" })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
}

export async function renderItemVisualSet(
  emoji: string,
  category: string,
): Promise<{ hero: Buffer; card: Buffer; thumbnail: Buffer }> {
  const hero = await renderHeroWebp(emoji, category);
  const [card, thumbnail] = await Promise.all([renderCardWebp(hero), renderThumbnailWebp(hero)]);
  return { hero, card, thumbnail };
}
