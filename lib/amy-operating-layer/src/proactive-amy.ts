import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { ProactiveAmyMessage, RiskPlaybookId } from "./types.js";
import { applyTrustFilter } from "./trust-safety.js";

export function generateProactiveMessages(
  snapshot: FamilyIntelligenceSnapshot,
): ProactiveAmyMessage[] {
  const messages: ProactiveAmyMessage[] = [];
  const expires = new Date(Date.now() + 48 * 3600000).toISOString();

  for (const p of snapshot.predictiveInterventions) {
    if (p.probability < 0.45) continue;
    const playbookId = mapPredictionToPlaybook(p.id);
    const raw: ProactiveAmyMessage = {
      id: p.id,
      urgency: p.probability >= 0.65 ? "high" : p.probability >= 0.5 ? "medium" : "low",
      title: proactiveTitle(p.id, snapshot.childName),
      body: p.recommendedAction,
      playbookId,
      surfaces: p.surfaces as ProactiveAmyMessage["surfaces"],
      expiresAt: expires,
    };
    messages.push(applyTrustFilter(raw));
  }

  for (const goal of snapshot.goals) {
    if (goal.active && goal.progress < goal.targetValue * 0.3 && goal.targetValue > 0) {
      const pct = Math.round((goal.progress / goal.targetValue) * 100);
      messages.push(
        applyTrustFilter({
          id: `goal_behind_${goal.id}`,
          urgency: "medium",
          title: `${goal.type} goal needs attention`,
          body: `Your ${goal.type} goal is at ${pct}%. A small step today keeps it achievable.`,
          surfaces: ["amy_ai", "parent_hub"],
          expiresAt: expires,
        }),
      );
    }
  }

  return messages.sort((a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency));
}

function mapPredictionToPlaybook(id: string): RiskPlaybookId | undefined {
  if (id.includes("streak") || id.includes("routine")) return "routine_collapse";
  if (id.includes("churn") || id.includes("parent")) return "parent_churn";
  if (id.includes("learning") || id.includes("disengage")) return "learning_disengagement";
  return undefined;
}

function proactiveTitle(id: string, childName: string): string {
  if (id.includes("streak")) return `Streak check-in for ${childName}`;
  if (id.includes("churn")) return "Quick family check-in";
  if (id.includes("learning")) return "Learning momentum";
  return "Amy noticed something";
}

function urgencyRank(u: ProactiveAmyMessage["urgency"]): number {
  return u === "high" ? 3 : u === "medium" ? 2 : 1;
}
