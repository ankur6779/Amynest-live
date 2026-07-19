import type { ParentInsightsV4 } from "@workspace/abacus";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function AbacusParentInsightsV4Panel({ report }: { report: ParentInsightsV4 }) {
  const TrendIcon =
    report.attentionTrend === "up"
      ? TrendingUp
      : report.attentionTrend === "down"
        ? TrendingDown
        : Minus;

  return (
    <div
      className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3 space-y-2 text-xs"
      data-testid="abacus-parent-insights-v4"
    >
      <p className="font-bold text-[11px] uppercase tracking-wide text-muted-foreground">
        Weekly Report · Learning DNA
      </p>
      <p>
        <strong>Improved:</strong> {report.whatImproved}
      </p>
      <p>
        <strong>Struggling:</strong> {report.whereStruggling}
      </p>
      <p>
        <strong>Practice tonight:</strong> {report.parentPractice}
      </p>
      <p className="inline-flex items-center gap-1">
        <TrendIcon className="h-3.5 w-3.5" />
        Attention: {report.attentionTrend} · Confidence: {report.confidenceLabel}
      </p>
      <p>
        Expected mastery date: <strong>{report.expectedMasteryDate}</strong>
      </p>
      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
        {report.recommendations.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
