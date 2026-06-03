import { useEffect, useState } from "react";
import { PremiumCard } from "@/components/learning-progress/premium-polish";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ImageIcon } from "lucide-react";

type CoveragePayload = {
  generatedAt?: string;
  mode?: string;
  totalAssets: number;
  presentAssets: number;
  missingAssets: number;
  coveragePct: number;
  blockers: string[];
  worlds: Array<{
    label: string;
    itemCount: number;
    coveragePct: number;
    missingAssets: number;
    totalAssets: number;
  }>;
};

export function AssetCoverageDashboard({ className }: { className?: string }) {
  const [data, setData] = useState<CoveragePayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetch("/discovery-worlds-coverage.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("missing"))))
      .then((json: CoveragePayload) => setData(json))
      .catch(() => setError(true));
  }, []);

  if (error || !data) return null;

  const ok = data.missingAssets === 0;

  return (
    <PremiumCard
      className={cn("p-4", className)}
      testId="discovery-asset-coverage"
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-bold text-foreground">Visual asset coverage</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.presentAssets} of {data.totalAssets} images ready · {data.coveragePct}% complete
            {data.mode ? ` · ${data.mode}` : ""}
          </p>
          <Progress value={data.coveragePct} className="mt-2 h-1.5" />
        </div>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.worlds.map((w) => (
          <li
            key={w.label}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs",
              w.coveragePct >= 100 ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/25 bg-amber-500/10",
            )}
          >
            <span className="font-semibold text-foreground">{w.label}</span>
            <span className="float-right tabular-nums">{w.coveragePct}%</span>
            <p className="mt-0.5 text-muted-foreground">
              {w.itemCount} items · {w.missingAssets} missing
            </p>
          </li>
        ))}
      </ul>

      {data.blockers.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-200" aria-label="Asset blockers">
          {data.blockers.slice(0, 4).map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
      )}
    </PremiumCard>
  );
}
