/**
 * Parent-facing Speech contributions from Knowledge Graph + Runtime.
 * No mastery math — displays platform summaries only.
 */

import { useMemo } from "react";
import { Mic } from "lucide-react";
import { PremiumCard } from "./premium-polish";
import { getSpeechCoachParentInsights } from "@/lib/speech-coach-learning-adapter";

export function SpeechKnowledgeInsightsCard({
  childId,
  childName,
}: {
  childId: number;
  childName: string;
}) {
  const insights = useMemo(
    () => getSpeechCoachParentInsights(childId),
    [childId],
  );

  const summary = insights.knowledgeSummary;
  const hasSignal =
    (summary?.touchedNodes ?? 0) > 0 ||
    insights.weakPhonemes.length > 0 ||
    insights.recommendations.length > 0;

  if (!hasSignal) {
    return (
      <PremiumCard>
        <div className="p-4 space-y-2" data-testid="speech-knowledge-insights-empty">
          <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            Speech in {childName}&apos;s knowledge map
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            After a few Speech Coach turns, sounds and words will appear here from the
            shared Knowledge Graph — the same map Amy uses for next practice.
          </p>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard>
      <div className="p-4 space-y-3" data-testid="speech-knowledge-insights">
        <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          Speech knowledge summary
        </h3>
        {summary ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {summary.touchedNodes} concepts touched · avg confidence{" "}
            {Math.round(summary.avgConfidence)}% · {summary.strugglingNodes} needing gentle
            practice
          </p>
        ) : null}
        {insights.weakPhonemes.length > 0 ? (
          <div>
            <div className="text-[11px] font-medium text-muted-foreground mb-1">
              Sounds to revisit
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {insights.weakPhonemes.map((p) => (
                <li
                  key={p.nodeId}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                >
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {insights.recommendations[0] ? (
          <p className="text-xs leading-relaxed">
            Next from Amy:{" "}
            <span className="font-medium">{insights.recommendations[0].label}</span>
            <span className="text-muted-foreground"> — {insights.recommendations[0].reason}</span>
          </p>
        ) : null}
        {insights.latestDecision ? (
          <p className="text-[11px] text-muted-foreground">
            Runtime: {insights.latestDecision.difficulty} difficulty · hints{" "}
            {insights.latestDecision.hints} · {insights.latestDecision.reason}
          </p>
        ) : null}
      </div>
    </PremiumCard>
  );
}
