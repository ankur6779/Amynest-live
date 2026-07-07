export type CopilotRequest = {
  question: string;
};

export type CopilotResponse = {
  question: string;
  answer: string;
  confidence: number;
  sources: string[];
  integrationStatus: "architecture_ready";
};

const PATTERNS: Array<{ match: RegExp; answer: string; sources: string[] }> = [
  {
    match: /revenue|mrr|arr/i,
    answer:
      "Revenue analysis will query the growth dashboard executive summary and subscription spine. Connect the LLM adapter to /api/admin/growth/gos/copilot when ready.",
    sources: ["executive.summary", "subscriptions", "analytics_events"],
  },
  {
    match: /india|usa|country|compare/i,
    answer:
      "Geographic comparison will use journey explorer and geography aggregates. The copilot backend is ready to route country-segmented SQL.",
    sources: ["geography", "journey-explorer"],
  },
  {
    match: /feature|subscription|drives/i,
    answer:
      "Feature impact lab ranks features by trial/subscription correlation. Ask Amy will surface Feature Impact Lab rankings once LLM is connected.",
    sources: ["feature-impact-lab", "executive.featureImpact"],
  },
  {
    match: /campaign|ltv|cac|roas/i,
    answer:
      "Campaign LTV requires ad platform integration. Campaign Hub architecture is ready for Meta, Google, Apple Search Ads, and TikTok.",
    sources: ["campaign-hub"],
  },
  {
    match: /predict|forecast|next month/i,
    answer:
      "MRR forecasts are available in Predictions (estimated, confidence-scored). LLM layer will narrate prediction-engine v2 output.",
    sources: ["prediction-engine-v2"],
  },
  {
    match: /churn/i,
    answer:
      "Churn signals derive from retention cohorts, subscription state, and inactivity events. Copilot will join cohort-explorer + subscriptions when LLM is enabled.",
    sources: ["cohort-explorer", "subscriptions"],
  },
];

export function answerCopilotQuestion(input: CopilotRequest): CopilotResponse {
  const q = input.question.trim();
  if (!q) {
    return {
      question: q,
      answer: "Ask a question about your growth metrics, campaigns, features, or forecasts.",
      confidence: 100,
      sources: [],
      integrationStatus: "architecture_ready",
    };
  }

  const hit = PATTERNS.find((p) => p.match.test(q));
  return {
    question: q,
    answer:
      hit?.answer ??
      "Amy Growth Copilot architecture is ready. This query will be answered by the LLM adapter using live GOS aggregates once connected.",
    confidence: hit ? 75 : 50,
    sources: hit?.sources ?? ["growth-dashboard", "growth-operating-system"],
    integrationStatus: "architecture_ready",
  };
}
