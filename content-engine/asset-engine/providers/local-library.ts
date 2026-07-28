import type { AssetRequest, AssetResolveContext, ResolvedAsset } from "../../types/asset-package.js";
import type { VisualType } from "../../types/storyboard.js";
import { BaseAssetProvider } from "./base.js";

interface LibraryEntry {
  id: string;
  path: string;
  types: VisualType[];
  keywords: string[];
  width: number;
  height: number;
}

/** Catalog of existing AmyNest promo / screenshot / illustration assets. */
const LOCAL_LIBRARY: LibraryEntry[] = [
  {
    id: "promo-poster-default",
    path: "library://promo/amynest-poster-default.jpg",
    types: ["Promo Image"],
    keywords: ["promo", "poster", "parenting", "discipline", "cta"],
    width: 1080,
    height: 1920,
  },
  {
    id: "promo-astro",
    path: "library://promo/amy-astro-poster.jpg",
    types: ["Promo Image", "AI Image", "Motion Background"],
    keywords: ["astro", "cosmic", "star", "amy"],
    width: 1080,
    height: 1920,
  },
  {
    id: "screenshot-speech",
    path: "library://screenshots/speech-coach.png",
    types: ["App Screen", "Screen Recording"],
    keywords: ["speech", "coach", "app", "learning"],
    width: 1080,
    height: 1920,
  },
  {
    id: "screenshot-routines",
    path: "library://screenshots/routines-timeline.png",
    types: ["App Screen", "Screen Recording"],
    keywords: ["routine", "timeline", "app"],
    width: 1080,
    height: 1920,
  },
  {
    id: "illustration-family",
    path: "library://illustrations/warm-family.png",
    types: ["Illustration", "Promo Image"],
    keywords: ["family", "parenting", "warm", "kids"],
    width: 1080,
    height: 1920,
  },
  {
    id: "gradient-brand",
    path: "library://backgrounds/brand-gradient.png",
    types: ["Gradient Background", "Motion Background"],
    keywords: ["gradient", "brand", "background"],
    width: 1080,
    height: 1920,
  },
  {
    id: "icon-pack",
    path: "library://icons/amynest-icon-pack.json",
    types: ["Icon Animation"],
    keywords: ["icon", "animation", "tip"],
    width: 1080,
    height: 1920,
  },
];

export class LocalLibraryProvider extends BaseAssetProvider {
  readonly id = "local-library" as const;

  supportsImages(): boolean {
    return true;
  }
  supportsVideo(): boolean {
    return false;
  }
  override supportsBranding(): boolean {
    return true;
  }

  async resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null> {
    const match = findBestEntry(request);
    if (!match) return null;
    return this.buildResolved(request, context, {
      path: match.path,
      status: "resolved",
      license: "AmyNest Owned Library",
      metadata: {
        libraryId: match.id,
        source: "local-library",
      },
    });
  }
}

function findBestEntry(request: AssetRequest): LibraryEntry | undefined {
  const haystack = `${request.prompt} ${request.fallback} ${request.assetType}`.toLowerCase();
  let best: { entry: LibraryEntry; score: number } | undefined;

  for (const entry of LOCAL_LIBRARY) {
    if (!entry.types.includes(request.assetType)) continue;
    let score = 1;
    for (const keyword of entry.keywords) {
      if (haystack.includes(keyword)) score += 2;
    }
    if (!best || score > best.score) best = { entry, score };
  }

  return best && best.score >= 3 ? best.entry : undefined;
}

export function listLocalLibraryEntries(): readonly LibraryEntry[] {
  return LOCAL_LIBRARY;
}
