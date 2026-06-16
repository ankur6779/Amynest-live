import { parseApiJson } from "@/lib/safe-json-response";
// i18n-ignore-start — internal dev A/B page for Rhymes 320 kbps vs 128 kbps QA
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listRhymesRegistryEntries } from "@workspace/rhymes-audio";
import { audioManager } from "@/lib/audio-manager";

const AB_API =
  (import.meta.env.VITE_RHYMES_AB_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:5010";

type Variant = "320" | "128";

type SignedPayload = {
  success: boolean;
  signedUrl?: string;
  error?: string;
};

type ReportFile = {
  id: string;
  title: string;
  originalSizeMb: number;
  newSizeMb: number;
  reductionPct: number;
  durationSec: number | null;
};

type ReportSummary = {
  totalOriginalMb: number;
  totalNewMb: number;
  totalReductionPct: number;
};

type QualitySample = {
  id: string;
  title: string;
  sampleReason: string;
  pass: boolean;
};

async function fetchSignedUrl(audioId: string, variant: Variant): Promise<string | null> {
  const res = await fetch(
    `${AB_API}/api/audio/signed-url/${encodeURIComponent(audioId)}?variant=${variant}`,
  );
  if (!res.ok) return null;
  const body = (await parseApiJson<SignedPayload>(res));
  return body.success && body.signedUrl ? body.signedUrl : null;
}

export default function RhymesAudioAbPage() {
  const entries = useMemo(() => [...listRhymesRegistryEntries()].sort((a, b) => a.title.localeCompare(b.title)), []);
  const [reportFiles, setReportFiles] = useState<Map<string, ReportFile>>(new Map());
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [qualitySamples, setQualitySamples] = useState<QualitySample[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [filter, setFilter] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const health = await fetch(`${AB_API}/api/health`);
        setApiOk(health.ok);
      } catch {
        setApiOk(false);
      }

      try {
        const res = await fetch(`${AB_API}/api/audio/rhymes-reencode-report`);
        if (res.ok) {
          const body = await parseApiJson<{ report?: { summary: ReportSummary; files: ReportFile[] } }>(res);
          if (body.report) {
            setSummary(body.report.summary);
            setReportFiles(new Map(body.report.files.map((f) => [f.id, f])));
          }
        }
      } catch {
        /* optional */
      }

      try {
        const res = await fetch(`${AB_API}/api/audio/rhymes-reencode-quality`);
        if (res.ok) {
          const body = (await parseApiJson<{ quality?: { samples: QualitySample[] } }>(res));
          if (body.quality?.samples) setQualitySamples(body.quality.samples);
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  const qualityIds = useMemo(() => new Set(qualitySamples.map((s) => s.id)), [qualitySamples]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.title.toLowerCase().includes(q) || e.id.includes(q));
  }, [entries, filter]);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(null);
    setLoading(null);
  }, []);

  const playVariant = useCallback(
    async (audioId: string, variant: Variant) => {
      const key = `${audioId}:${variant}`;
      if (playing === key) {
        stopCurrent();
        return;
      }
      stopCurrent();
      setLoading(key);
      const url = await fetchSignedUrl(audioId, variant);
      if (!url) {
        setLoading(null);
        return;
      }
      const audio = audioManager.create(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(null);
        setLoading(null);
      };
      audio.onerror = () => {
        setPlaying(null);
        setLoading(null);
      };
      try {
        await audio.play();
        setPlaying(key);
      } catch {
        setPlaying(null);
      } finally {
        setLoading(null);
      }
    },
    [playing, stopCurrent],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rhymes Audio A/B — 320 kbps vs 128 kbps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Temporary listening comparison. Production still serves <code>Rhymes/</code> (320 kbps). Staging:{" "}
          <code>Rhymes-128/</code>.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Audit API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Endpoint: <code>{AB_API}</code> —{" "}
            {apiOk === null ? (
              <span className="text-muted-foreground">checking…</span>
            ) : apiOk ? (
              <Badge variant="secondary">connected</Badge>
            ) : (
              <Badge variant="destructive">offline — run pnpm dev:rhymes-ab-api</Badge>
            )}
          </p>
          {summary && (
            <p>
              Re-encode report: {summary.totalOriginalMb} MB → {summary.totalNewMb} MB (
              <strong>{summary.totalReductionPct}%</strong> reduction)
            </p>
          )}
          {qualitySamples.length > 0 && (
            <p>
              Quality audit: {qualitySamples.filter((s) => s.pass).length}/{qualitySamples.length} passed
            </p>
          )}
        </CardContent>
      </Card>

      <input
        type="search"
        placeholder="Filter by title…"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="space-y-3">
        {filtered.map((entry) => {
          const report = reportFiles.get(entry.id);
          const quality = qualitySamples.find((s) => s.id === entry.id);
          const origKey = `${entry.id}:320`;
          const encKey = `${entry.id}:128`;
          return (
            <Card key={entry.id} className={cn(qualityIds.has(entry.id) && "ring-1 ring-primary/40")}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{entry.title}</span>
                    {quality && (
                      <Badge variant={quality.pass ? "secondary" : "destructive"}>{quality.sampleReason}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {report
                      ? `${report.originalSizeMb} MB → ${report.newSizeMb} MB (−${report.reductionPct}%) · ${report.durationSec ?? "?"}s`
                      : `${(entry.sizeBytes / (1024 * 1024)).toFixed(2)} MB (registry)`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!apiOk || loading === origKey}
                    onClick={() => void playVariant(entry.id, "320")}
                  >
                    {loading === origKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : playing === origKey ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span className="ml-1">320k</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!apiOk || loading === encKey}
                    onClick={() => void playVariant(entry.id, "128")}
                  >
                    {loading === encKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : playing === encKey ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                    <span className="ml-1">128k</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
