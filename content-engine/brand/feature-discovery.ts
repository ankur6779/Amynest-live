import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { inferPillarFromText, selectBrandCharacters } from "./characters.js";
import type { BrandCharacterId, BrandFeaturePillar, DiscoveredFeature } from "./types.js";

export interface FeatureDiscoveryOptions {
  repoRoot: string;
  maxFeatures?: number;
}

const PAGE_ALLOWLIST = [
  "dashboard",
  "ai-coach",
  "amy-ai-tutor",
  "amy-learning-tutor",
  "audio-lessons",
  "birth-sky",
  "animal-world",
  "discovery-worlds-hub",
  "abacus",
  "assistant",
  "environment",
  "event-prep",
];

const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  "__tests__",
  "test",
  "tests",
  ".git",
]);

/**
 * Discover real AmyNest product surfaces from the repository.
 * New modules under features/pages/docs become eligible automatically.
 */
export function discoverAmyNestFeatures(
  options: FeatureDiscoveryOptions,
): DiscoveredFeature[] {
  const root = options.repoRoot;
  const max = options.maxFeatures ?? 80;
  const found = new Map<string, DiscoveredFeature>();

  const kidschedule = join(root, "artifacts", "kidschedule");
  scanFeatureModules(join(kidschedule, "src", "features"), found, root);
  scanPages(join(kidschedule, "src", "pages"), found, root);
  scanSeoRoutes(join(kidschedule, "src", "lib", "marketing", "seo-routes.ts"), found, root);
  scanDocs(join(root, "docs"), found, root);
  seedCharacterBibleMappings(found);

  const list = [...found.values()].sort((a, b) => a.title.localeCompare(b.title));
  return list.slice(0, max);
}

export function selectFeatureForTopic(
  features: readonly DiscoveredFeature[],
  topic: { id: string; title: string; category: string; keywords: string[] },
): DiscoveredFeature | undefined {
  if (features.length === 0) return undefined;
  const hay = [topic.title, topic.category, ...topic.keywords].join(" ").toLowerCase();
  let best: DiscoveredFeature | undefined;
  let bestScore = -1;
  for (const feature of features) {
    let score = 0;
    for (const keyword of feature.keywords) {
      if (hay.includes(keyword.toLowerCase())) score += 3;
    }
    if (hay.includes(feature.pillar)) score += 2;
    if (hay.includes(feature.title.toLowerCase())) score += 5;
    if (score > bestScore) {
      bestScore = score;
      best = feature;
    }
  }
  if (best && bestScore > 0) return best;

  // Deterministic rotation fallback so topics stay feature-grounded.
  let hash = 0;
  for (let i = 0; i < topic.id.length; i++) hash = (hash * 33 + topic.id.charCodeAt(i)) >>> 0;
  return features[hash % features.length];
}

function scanFeatureModules(
  dir: string,
  out: Map<string, DiscoveredFeature>,
  repoRoot: string,
): void {
  if (!existsSync(dir)) return;
  for (const entry of safeList(dir)) {
    const full = join(dir, entry);
    if (!isDir(full) || EXCLUDED_DIR_NAMES.has(entry)) continue;
    const id = slugify(entry);
    const pillar = inferPillarFromText(entry);
    out.set(id, {
      id,
      title: titleCase(entry.replace(/-/g, " ")),
      pillar,
      sourcePath: relative(repoRoot, full),
      sourceKind: "feature-module",
      keywords: keywordsFromName(entry),
      preferredCharacter: preferredCharacterFor(pillar, entry),
      summary: `Implemented feature module: ${entry}`,
    });
  }
}

function scanPages(
  dir: string,
  out: Map<string, DiscoveredFeature>,
  repoRoot: string,
): void {
  if (!existsSync(dir)) return;
  for (const entry of safeList(dir)) {
    if (!entry.endsWith(".tsx") && !entry.endsWith(".ts")) continue;
    const base = basename(entry, entry.endsWith(".tsx") ? ".tsx" : ".ts");
    if (base.startsWith("admin-") || base.includes("callback") || base.includes("debug")) {
      continue;
    }
    const allowed =
      PAGE_ALLOWLIST.includes(base) ||
      /coach|learning|speech|astro|health|game|routine|audio|habit|premium|nutrition|abacus|birth|discovery|animal|tutor/i.test(
        base,
      );
    if (!allowed) continue;
    const id = slugify(base);
    if (out.has(id)) continue;
    const pillar = inferPillarFromText(base);
    out.set(id, {
      id,
      title: titleCase(base.replace(/-/g, " ")),
      pillar,
      sourcePath: relative(repoRoot, join(dir, entry)),
      sourceKind: "page",
      keywords: keywordsFromName(base),
      preferredCharacter: preferredCharacterFor(pillar, base),
      summary: `Product page surface: ${base}`,
    });
  }
}

function scanSeoRoutes(
  filePath: string,
  out: Map<string, DiscoveredFeature>,
  repoRoot: string,
): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  const matches = text.matchAll(/path:\s*`?\/features\/\$\{?slug\}?`?|\/features\/([a-z0-9-]+)/gi);
  for (const match of matches) {
    const slug = match[1];
    if (!slug) continue;
    const id = slugify(slug);
    if (out.has(id)) continue;
    const pillar = inferPillarFromText(slug);
    out.set(id, {
      id,
      title: titleCase(slug.replace(/-/g, " ")),
      pillar,
      sourcePath: relative(repoRoot, filePath),
      sourceKind: "seo-route",
      keywords: keywordsFromName(slug),
      preferredCharacter: preferredCharacterFor(pillar, slug),
      summary: `SEO feature route: /features/${slug}`,
    });
  }
}

function scanDocs(
  dir: string,
  out: Map<string, DiscoveredFeature>,
  repoRoot: string,
): void {
  if (!existsSync(dir)) return;
  walkMarkdown(dir, (file) => {
    const name = basename(file).replace(/\.md$/i, "");
    if (!/feature|speech|astro|routine|habit|learning|coach|health|game|premium/i.test(name)) {
      return;
    }
    const id = slugify(`docs-${name}`);
    if (out.has(id)) return;
    const pillar = inferPillarFromText(name);
    out.set(id, {
      id,
      title: titleCase(name.replace(/[-_]/g, " ")),
      pillar,
      sourcePath: relative(repoRoot, file),
      sourceKind: "docs",
      keywords: keywordsFromName(name),
      preferredCharacter: preferredCharacterFor(pillar, name),
      summary: `Documentation topic: ${name}`,
    });
  });
}

function seedCharacterBibleMappings(out: Map<string, DiscoveredFeature>): void {
  const seeds: Array<{
    id: string;
    title: string;
    pillar: BrandFeaturePillar;
    character: BrandCharacterId;
    keywords: string[];
  }> = [
    {
      id: "learning-zone",
      title: "Learning Zone",
      pillar: "learning",
      character: "amy-girl",
      keywords: ["learning", "tutor", "phonics", "reading"],
    },
    {
      id: "amy-astro",
      title: "Amy Astro Intelligence",
      pillar: "astro",
      character: "amy-boy",
      keywords: ["astro", "birth sky", "constellation"],
    },
    {
      id: "health-lab",
      title: "Health Lab",
      pillar: "health",
      character: "amy-girl",
      keywords: ["health", "nutrition", "wellness"],
    },
    {
      id: "speech-practice",
      title: "Speech Practice",
      pillar: "speech",
      character: "amy-girl",
      keywords: ["speech", "voice", "pronunciation"],
    },
    {
      id: "amy-coach",
      title: "Amy Coach",
      pillar: "coach",
      character: "amy-ai",
      keywords: ["coach", "amy ai", "parenting"],
    },
    {
      id: "daily-routines",
      title: "Daily Routines",
      pillar: "routine",
      character: "amy-girl",
      keywords: ["routine", "habit", "patent pending"],
    },
    {
      id: "audio-lessons",
      title: "Audio Lessons",
      pillar: "audio",
      character: "amy-ai",
      keywords: ["audio", "lessons", "listening"],
    },
    {
      id: "games-hub",
      title: "Games Hub",
      pillar: "games",
      character: "amy-boy",
      keywords: ["games", "memory", "focus", "motor"],
    },
  ];

  for (const seed of seeds) {
    if (out.has(seed.id)) continue;
    out.set(seed.id, {
      id: seed.id,
      title: seed.title,
      pillar: seed.pillar,
      sourcePath: "content-engine/brand/feature-discovery.ts",
      sourceKind: "character-bible",
      keywords: seed.keywords,
      preferredCharacter: seed.character,
      summary: `Canonical content pillar from AmyNest character bible: ${seed.title}`,
    });
  }
}

function preferredCharacterFor(pillar: BrandFeaturePillar, text: string): BrandCharacterId {
  return selectBrandCharacters({ category: pillar, title: text }).primary;
}

function keywordsFromName(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[-_\s./]+/)
    .filter((p) => p.length > 2);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function safeList(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function walkMarkdown(dir: string, visit: (file: string) => void, depth = 0): void {
  if (depth > 4 || !existsSync(dir)) return;
  for (const entry of safeList(dir)) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue;
    const full = join(dir, entry);
    if (isDir(full)) walkMarkdown(full, visit, depth + 1);
    else if (entry.endsWith(".md")) visit(full);
  }
}
