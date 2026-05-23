import type { SessionPlanItem } from "../types-v2.js";
import type { TopicContext } from "./types.js";
import type { TutorState } from "./types.js";

export type HybridTutorStep = {
  contentItem: SessionPlanItem;
  topic: TopicContext;
  phase: "intro" | "tutor_explain" | "child_answer" | "wrap";
};

export function buildHybridSteps(
  sessionPlan: SessionPlanItem[],
  skillLevel = 2,
): HybridTutorStep[] {
  return sessionPlan.slice(0, 6).map((item, index) => ({
    contentItem: item,
    topic: {
      moduleId: item.moduleId,
      topic: item.contentId.replace(/_/g, " "),
      skillLevel,
      difficulty: item.difficulty,
    },
    phase: index === 0 ? "intro" : "tutor_explain",
  }));
}

export function topicFromContentItem(
  item: SessionPlanItem,
  skillLevel: number,
): TopicContext {
  return {
    moduleId: item.moduleId,
    topic: `${item.moduleId} activity`,
    skillLevel,
    difficulty: item.difficulty,
  };
}

export function hybridIntroMessage(item: SessionPlanItem): string {
  const slotLabel =
    item.slot === "warmup"
      ? "warm-up"
      : item.slot === "reward"
        ? "fun reward"
        : item.slot === "exploration"
          ? "explore time"
          : "learning";
  return `Next up: a ${slotLabel} about ${item.moduleId.replace(/_/g, " ")}.`;
}

export function alignTutorWithContent(
  state: TutorState,
  item: SessionPlanItem,
): TutorState {
  return {
    ...state,
    contentItem: item,
    currentTopic: topicFromContentItem(item, state.currentSkillLevel).topic,
  };
}
