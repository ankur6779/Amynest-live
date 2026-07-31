/**
 * Parent-facing Story World contributions from Knowledge Graph + Runtime.
 * No mastery math — displays platform summaries only.
 */

import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { PremiumCard } from "./premium-polish";
import { getStoryWorldParentInsights } from "@/lib/story-world-learning-adapter";

export function StoryKnowledgeInsightsCard({
  childId,
  childName,
}: {
  childId: number;
  childName: string;
}) {
  const insights = useMemo(
    () => getStoryWorldParentInsights(childId),
    [childId],
  );

  const summary = insights.knowledgeSummary;
  const hasSignal =
    (summary?.touchedNodes ?? 0) > 0 ||
    insights.recommendations.length > 0 ||
    Boolean(insights.latestDecision);

  if (!hasSignal) {
    return (
      <PremiumCard>
        <div className="p-4 space-y-2" data-testid="story-knowledge-insights-empty">
          <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Stories in {childName}&apos;s knowledge map
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            After Story World chapters, words and story concepts appear here from the
            shared Knowledge Graph — the same map Amy uses for what to read next.
          </p>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard>
      <div className="p-4 space-y-3" data-testid="story-knowledge-insights">
        <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Story knowledge summary
        </h3>
        {summary ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {summary.touchedNodes} concepts touched · avg confidence{" "}
            {Math.round(summary.avgConfidence)}% · {summary.strugglingNodes} needing gentle
            revisit
          </p>
        ) : null}
        {insights.recommendations[0] ? (
          <p className="text-xs leading-relaxed">
            Next from Amy:{" "}
            <span className="font-medium">{insights.recommendations[0].label}</span>
            <span className="text-muted-foreground">
              {" "}
              — {insights.recommendations[0].reason}
            </span>
          </p>
        ) : null}
        {insights.latestDecision ? (
          <p className="text-[11px] text-muted-foreground">
            Runtime: {insights.latestDecision.difficulty} difficulty · narration{" "}
            {insights.latestDecision.narrationLength} · {insights.latestDecision.reason}
          </p>
        ) : null}
      </div>
    </PremiumCard>
  );
}
