/**
 * OTA download UI for the extended infant sleep audio pack.
 */
import { useState } from "react";
import { Download, Check, Loader2, AlertCircle } from "lucide-react";
import { SLEEP_PACKS, type SleepPackId } from "@/data/infant-sleep-catalog";
import {
  getSleepPackDownloadVersion,
  isSleepPackDownloaded,
  markSleepPackDownloaded,
} from "@/lib/infant-sleep-library-state";

const EXTENDED_PACK: SleepPackId = "extended-v1";

export function InfantSleepPackDownload({ childId }: { childId?: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(() =>
    isSleepPackDownloaded(EXTENDED_PACK, childId),
  );
  const pack = SLEEP_PACKS[EXTENDED_PACK];

  async function handleDownload() {
    if (downloaded || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const manifestUrl = "/infant-sleep-audio/manifest.json";
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error("Could not load the sleep audio catalog.");
      const manifest = (await res.json()) as {
        version?: number;
        items?: { assetPath?: string; packId?: string }[];
      };
      const manifestVersion = typeof manifest.version === "number" ? manifest.version : 1;

      const paths = (manifest.items ?? [])
        .filter((i) => i.packId === EXTENDED_PACK && i.assetPath)
        .map((i) => `/infant-sleep-audio/${i.assetPath!.replace(/^\/+/, "")}`);

      if (paths.length === 0) {
        throw new Error("No extended pack files found in the catalog.");
      }

      await Promise.all(
        paths.map(async (url) => {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`Download failed: ${url}`);
          await r.blob();
        }),
      );

      markSleepPackDownloaded(EXTENDED_PACK, childId, manifestVersion);
      setDownloaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed. Try again.";
      setError(message);
      setDownloaded(false);
    } finally {
      setDownloading(false);
    }
  }

  if (downloaded && !error) {
    return (
      <div
        className="sleep-section-header flex items-center gap-2.5 !py-2.5"
        data-testid="sleep-pack-downloaded"
      >
        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-[11px] text-muted-foreground">
          <strong className="text-foreground">{pack.label}</strong> is ready for offline use (~{pack.estimatedMb} MB).
        </span>
      </div>
    );
  }

  return (
    <div
      className="sleep-section-header sleep-section-header--story space-y-2.5"
      data-testid="sleep-pack-download-prompt"
    >
      <p className="text-[12px] font-bold text-foreground">{pack.label}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{pack.description}</p>
      <p className="text-[10px] text-muted-foreground">Estimated size: ~{pack.estimatedMb} MB</p>
      {error ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
          data-testid="sleep-pack-download-error"
        >
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive leading-snug">{error}</p>
        </div>
      ) : null}
      <button
        onClick={() => void handleDownload()}
        disabled={downloading}
        data-testid="sleep-pack-download-btn"
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-70"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Downloading…
          </>
        ) : error ? (
          <>Retry download</>
        ) : (
          <>
            <Download className="h-4 w-4" /> Download for offline
          </>
        )}
      </button>
    </div>
  );
}
