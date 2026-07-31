/**
 * Parent-facing Games Hub contributions from Knowledge Graph + Runtime.
 * No mastery math — displays platform summaries only.
 */

import { useMemo } from "react";
import { Gamepad2 } from "lucide-react";
import { PremiumCard } from "./premium-polish";
import { getGamesWorldParentInsights } from "@/lib/games-world-learning-adapter";

export function GamesKnowledgeInsightsCard({
  childId,
  childName,
}: {
  childId: number;
  childName: string;
}) {
  const insights = useMemo(
    () => getGamesWorldParentInsights(childId),
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
        <div className="p-4 space-y-2" data-testid="games-knowledge-insights-empty">
          <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            Games in {childName}&apos;s knowledge map
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            After educational games, skills and concepts appear here from the shared
            Knowledge Graph — the same map Amy uses for what to play next.
          </p>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard>
      <div className="p-4 space-y-3" data-testid="games-knowledge-insights">
        <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-primary" />
          Games knowledge summary
        </h3>
        {summary ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {summary.touchedNodes} concepts touched · avg confidence{" "}
            {Math.round(summary.avgConfidence)}% · {summary.strugglingNodes} needing gentle
            practice
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
            Runtime: {insights.latestDecision.difficulty} difficulty · celebration{" "}
            {insights.latestDecision.celebrationLevel} ·{" "}
            {insights.latestDecision.reason}
          </p>
        ) : null}
      </div>
    </PremiumCard>
  );
}
