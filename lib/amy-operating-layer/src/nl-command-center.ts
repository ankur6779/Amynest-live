import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { NlCommandResult } from "./types.js";

const COMMAND_PATTERNS: Array<{
  pattern: RegExp;
  handler: (s: FamilyIntelligenceSnapshot) => NlCommandResult;
}> = [
  {
    pattern: /how are we doing|how'?s the family|family status/i,
    handler: (s) => ({
      answer:
        `Your family health score is ${s.health.score}/100 (${s.health.trend7d >= 0 ? "trending up" : "needs attention"}). ` +
        `Overall success: ${s.successMetrics.overallSuccess}%. ` +
        (s.topAction ? `Top focus: ${s.topAction.title}.` : "No urgent actions today."),
      sources: ["family_health_score", "success_metrics"],
      confidence: "observation",
      relatedActions: s.allActions.slice(0, 3),
    }),
  },
  {
    pattern: /what should we focus|what to focus|priority|biggest focus/i,
    handler: (s) => ({
      answer: s.topAction
        ? `Focus on: ${s.topAction.title}. ${s.topAction.description}`
        : "Maintain your current rhythm — consistency is working.",
      sources: ["action_prioritizer"],
      confidence: "observation",
      relatedActions: s.topAction ? [s.topAction] : [],
    }),
  },
  {
    pattern: /biggest risk|what'?s the risk|main risk/i,
    handler: (s) => ({
      answer:
        `Primary risk: ${s.risks.primaryRisk.replace(/_/g, " ")} ` +
        `(overall risk level: ${Math.round(s.risks.overallRisk * 100)}%). ` +
        (s.predictiveInterventions[0]
          ? `Prediction: ${s.predictiveInterventions[0].prediction}`
          : ""),
      sources: ["risk_engine", "predictive_interventions"],
      confidence: "prediction",
      relatedActions: s.allActions.filter((a) => a.category.includes("risk") || a.category.includes("retention")).slice(0, 2),
    }),
  },
  {
    pattern: /engagement drop|why.*drop|engagement down/i,
    handler: (s) => ({
      answer: buildEngagementDropAnswer(s),
      sources: ["health_components", "success_metrics"],
      confidence: "observation",
      relatedActions: s.allActions.slice(0, 2),
    }),
  },
  {
    pattern: /goal|reading goal|routine goal|learning goal|screen.?time/i,
    handler: (s) => ({
      answer:
        s.goals.length > 0
          ? s.goals.map((g) => `${g.target}: ${g.progress}/${g.targetValue} ${g.unit}`).join(". ")
          : "No active goals — I can help you set a reading, routine, or learning goal.",
      sources: ["goal_engine"],
      confidence: "observation",
      relatedActions: [],
    }),
  },
];

export function answerNaturalLanguageCommand(
  question: string,
  snapshot: FamilyIntelligenceSnapshot,
): NlCommandResult {
  const q = question.trim();
  for (const { pattern, handler } of COMMAND_PATTERNS) {
    if (pattern.test(q)) return handler(snapshot);
  }

  return {
    answer:
      `Based on your family data: health ${snapshot.health.score}/100, ` +
      `${snapshot.childName}'s top priority is ${snapshot.topAction?.title ?? "maintaining consistency"}. ` +
      `Ask me "How are we doing?" or "What's the biggest risk?" for specific insights.`,
    sources: ["family_intelligence_snapshot"],
    confidence: "observation",
    relatedActions: snapshot.allActions.slice(0, 2),
  };
}

function buildEngagementDropAnswer(s: FamilyIntelligenceSnapshot): string {
  const parts: string[] = [];
  if (s.health.components.parentEngagement < 50) {
    parts.push("Parent engagement signals are lower than usual.");
  }
  if (s.health.components.learningConsistency < 50) {
    parts.push("Learning sessions decreased this week.");
  }
  if (s.health.components.routineConsistency < 50) {
    parts.push("Routine completion dropped — this often correlates with overall engagement.");
  }
  if (parts.length === 0) {
    return "Engagement looks stable from available data. If it feels different, tell me what changed.";
  }
  return parts.join(" ") + " This is based on observed patterns, not a diagnosis.";
}
