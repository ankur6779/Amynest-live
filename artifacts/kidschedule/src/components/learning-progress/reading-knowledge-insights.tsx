/**
 * Parent-facing Reading World — Knowledge Summary, Timeline, Skills, Journey.
 * No mastery math — displays platform summaries only.
 */

import { useMemo } from "react";
import { BookMarked } from "lucide-react";
import { PremiumCard } from "./premium-polish";
import { getReadingWorldParentInsights } from "@/lib/reading-world-learning-adapter";

export function ReadingKnowledgeInsightsCard({
  childId,
  childName,
}: {
  childId: number;
  childName: string;
}) {
  const insights = useMemo(
    () => getReadingWorldParentInsights(childId),
    [childId],
  );

  const summary = insights.knowledgeSummary;
  const hasSignal =
    (summary?.touchedNodes ?? 0) > 0 ||
    insights.weakPhonemes.length > 0 ||
    insights.recommendations.length > 0 ||
    insights.readingSkills.length > 0 ||
    Boolean(insights.latestDecision);

  if (!hasSignal) {
    return (
      <PremiumCard>
        <div className="p-4 space-y-2" data-testid="reading-knowledge-insights-empty">
          <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" />
            Reading in {childName}&apos;s knowledge map
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            After Reading World lessons, letters, sounds, and words appear here from the
            shared Knowledge Graph — the same map Amy uses for what to practice next.
          </p>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard>
      <div className="p-4 space-y-4" data-testid="reading-knowledge-insights">
        <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-primary" />
          Reading knowledge summary
        </h3>
        {summary ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {summary.touchedNodes} concepts touched · avg confidence{" "}
            {Math.round(summary.avgConfidence)}% · {summary.strugglingNodes} needing gentle
            practice
          </p>
        ) : null}

        {insights.timelineLabels.length > 0 ? (
          <div data-testid="reading-timeline">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">
              Reading timeline
            </div>
            <ul className="space-y-1">
              {insights.timelineLabels.map((label) => (
                <li key={label} className="text-xs leading-relaxed">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {insights.readingSkills.length > 0 ? (
          <div data-testid="reading-skills">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">
              Reading skills
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {insights.readingSkills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
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
            <span className="text-muted-foreground">
              {" "}
              — {insights.recommendations[0].reason}
            </span>
          </p>
        ) : null}

        {insights.journeyLine ? (
          <p
            className="text-[11px] text-muted-foreground"
            data-testid="reading-learning-journey"
          >
            {insights.journeyLine}
          </p>
        ) : null}
      </div>
    </PremiumCard>
  );
}
