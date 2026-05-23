import type { ModuleId } from "../types.js";
import type { SessionPlanItem } from "../types-v2.js";
import type { RealtimeDecision, RealtimeSessionState } from "./types.js";

const REWARD_CONTENT: Record<ModuleId, string> = {
  phonics: "reward_phonics_celebration",
  motor_skills: "reward_motor_dance",
  social_emotional: "reward_social_highfive",
  language: "reward_language_rhyme",
  cognitive: "reward_cognitive_star",
  creativity: "reward_creativity_paint",
  stories: "reward_story_giggle",
  puzzles: "reward_puzzle_confetti",
};

function rewardItem(moduleId: ModuleId): SessionPlanItem {
  return {
    slot: "reward",
    moduleId,
    contentId: REWARD_CONTENT[moduleId] ?? "reward_generic_celebration",
    contentType: "fun",
    difficulty: "easy",
    explorationItem: false,
  };
}

export type MutateSessionResult = {
  sessionPlan: SessionPlanItem[];
  currentIndex: number;
  applied: boolean;
};

/**
 * Applies a realtime decision to the in-flight session plan.
 */
export function mutateSession(
  state: RealtimeSessionState,
  decision: RealtimeDecision,
): MutateSessionResult {
  if (decision.action === "NOOP") {
    return {
      sessionPlan: state.sessionPlan,
      currentIndex: state.currentIndex,
      applied: false,
    };
  }

  const plan = [...state.sessionPlan];
  let index = state.currentIndex;

  switch (decision.action) {
    case "ADJUST_DIFFICULTY":
      return { sessionPlan: plan, currentIndex: index, applied: true };

    case "SWAP_CONTENT": {
      const nextIdx = index + 1;
      if (nextIdx >= plan.length) {
        return { sessionPlan: plan, currentIndex: index, applied: false };
      }
      const current = plan[nextIdx]!;
      const replacement = findSwapCandidate(plan, current.moduleId, current.contentId);
      if (replacement) {
        plan[nextIdx] = { ...replacement, slot: current.slot };
      }
      return { sessionPlan: plan, currentIndex: index, applied: !!replacement };
    }

    case "INJECT_REWARD": {
      const mod = plan[index]?.moduleId ?? plan[0]?.moduleId ?? "stories";
      const injectAt = Math.min(index + 1, plan.length);
      plan.splice(injectAt, 0, rewardItem(mod));
      return { sessionPlan: plan, currentIndex: index, applied: true };
    }

    case "SHORTEN_SESSION": {
      const removeCount = Number(decision.payload.removeCount ?? 2);
      const remaining = plan.slice(0, Math.max(index + 2, plan.length - removeCount));
      const reward = plan[plan.length - 1];
      if (reward?.slot === "reward" && !remaining.some((p) => p.contentId === reward.contentId)) {
        remaining.push(reward);
      }
      return {
        sessionPlan: remaining,
        currentIndex: Math.min(index, remaining.length - 1),
        applied: true,
      };
    }

    default:
      return { sessionPlan: plan, currentIndex: index, applied: false };
  }
}

function findSwapCandidate(
  plan: SessionPlanItem[],
  moduleId: ModuleId,
  excludeContentId: string,
): SessionPlanItem | null {
  const alt = plan.find(
    (p) => p.moduleId !== moduleId && p.contentId !== excludeContentId,
  );
  if (alt) return { ...alt, slot: "core" };
  const sameMod = plan.find(
    (p) => p.moduleId === moduleId && p.contentId !== excludeContentId,
  );
  return sameMod ? { ...sameMod, slot: "core" } : null;
}

export function reorderRemaining(
  plan: SessionPlanItem[],
  fromIndex: number,
  seed: number,
): SessionPlanItem[] {
  const head = plan.slice(0, fromIndex + 1);
  const tail = plan.slice(fromIndex + 1);
  const keyed = tail.map((item, i) => ({
    item,
    sort: (seed + i * 17) % 1000,
  }));
  keyed.sort((a, b) => a.sort - b.sort);
  return [...head, ...keyed.map((k) => k.item)];
}
