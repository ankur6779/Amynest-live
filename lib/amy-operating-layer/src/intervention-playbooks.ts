import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { InterventionPlaybook, RiskPlaybookId } from "./types.js";

export const INTERVENTION_PLAYBOOKS: InterventionPlaybook[] = [
  {
    id: "routine_collapse",
    title: "Routine Recovery Playbook",
    triggerCondition: "routineCollapseRisk >= 0.4 OR streak broken",
    steps: [
      { day: 1, action: "Simplify routine to 3 essential tasks", surface: "routine" },
      { day: 1, action: "Send gentle morning reminder", surface: "notifications" },
      { day: 2, action: "Coach parent on one small win", surface: "amy_ai" },
      { day: 3, action: "Celebrate first completed task", surface: "rewards" },
      { day: 5, action: "Review and adjust routine length", surface: "parent_hub" },
    ],
    successCriteria: "3 of 5 days with at least one routine task completed",
  },
  {
    id: "parent_churn",
    title: "Win-Back Playbook",
    triggerCondition: "parentChurnRisk >= 0.45 OR daysSinceLastActive >= 3",
    steps: [
      { day: 1, action: "Warm check-in message — no guilt", surface: "amy_ai" },
      { day: 2, action: "Highlight one past win from timeline", surface: "parent_hub" },
      { day: 3, action: "Two-minute routine challenge", surface: "notifications" },
    ],
    successCriteria: "Parent returns and completes one session within 7 days",
  },
  {
    id: "learning_disengagement",
    title: "Learning Re-Engagement Playbook",
    triggerCondition: "learningDisengagementRisk >= 0.35 OR 0 lessons in 7 days",
    steps: [
      { day: 1, action: "5-minute low-friction lesson suggestion", surface: "learning_zone" },
      { day: 2, action: "Focus on weakest subject only", surface: "amy_ai" },
      { day: 4, action: "Celebrate any completion", surface: "rewards" },
    ],
    successCriteria: "2 learning sessions completed within 7 days",
  },
  {
    id: "sleep_inconsistency",
    title: "Sleep Rhythm Playbook",
    triggerCondition: "sleepConsistency < 50 OR improve_sleep goal active",
    steps: [
      { day: 1, action: "Suggest 30-min screen-free wind-down", surface: "amy_ai" },
      { day: 2, action: "Evening routine adjustment", surface: "routine" },
      { day: 3, action: "Track sleep quality signal", surface: "parent_hub" },
    ],
    successCriteria: "Sleep quality average improves over 7 days",
  },
];

export function selectActivePlaybook(snapshot: FamilyIntelligenceSnapshot): InterventionPlaybook | null {
  const { risks, health } = snapshot;

  if (risks.routineCollapseRisk >= 0.4) {
    return INTERVENTION_PLAYBOOKS.find((p) => p.id === "routine_collapse") ?? null;
  }
  if (risks.parentChurnRisk >= 0.45) {
    return INTERVENTION_PLAYBOOKS.find((p) => p.id === "parent_churn") ?? null;
  }
  if (risks.learningDisengagementRisk >= 0.35) {
    return INTERVENTION_PLAYBOOKS.find((p) => p.id === "learning_disengagement") ?? null;
  }
  if (health.components.sleepConsistency < 50) {
    return INTERVENTION_PLAYBOOKS.find((p) => p.id === "sleep_inconsistency") ?? null;
  }
  return null;
}

export function getPlaybookById(id: RiskPlaybookId): InterventionPlaybook | undefined {
  return INTERVENTION_PLAYBOOKS.find((p) => p.id === id);
}
