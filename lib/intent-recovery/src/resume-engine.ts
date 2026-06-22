import { getCampaignById } from "@workspace/notification-engine";
import {
  campaignStepToAction,
  resolveRoutedAction,
  type ActionTarget,
} from "@workspace/action-routing";
import type { CreateIntentInput, IntentSyncContext, IntentType, UserIntent } from "./types.js";
import { isResumableState } from "./state-machine.js";

export const INTENT_RECOVERY_ENGINE_VERSION = "1.0.0";

const DEFAULT_TTL_HOURS = 72;

export function newIntentId(): string {
  return `intent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function buildCreateIntentInput(
  partial: Omit<CreateIntentInput, "userId"> & { userId: string },
): CreateIntentInput {
  return {
    ttlHours: DEFAULT_TTL_HOURS,
    intentPriority: priorityForType(partial.intentType),
    progressPct: 0,
    progressJson: {},
    ...partial,
  };
}

function priorityForType(type: IntentType): number {
  switch (type) {
    case "FINISH_ROUTINE_ITEM":
    case "COMPLETE_ROUTINE":
      return 90;
    case "CONTINUE_CAMPAIGN":
    case "START_READING_CHALLENGE":
    case "CONTINUE_PHONICS_CHALLENGE":
    case "CONTINUE_NUTRITION_CHALLENGE":
      return 85;
    case "CONTINUE_LEARNING_SESSION":
    case "FINISH_LESSON":
      return 80;
    case "AMY_RECOMMENDED_ACTION":
    case "NOTIFICATION_ACTION":
      return 75;
    case "COMPLETE_GOAL_STEP":
      return 70;
    case "REVIEW_WEEKLY_REPORT":
      return 60;
    case "RESUME_AUDIO_LESSON":
    case "CONTINUE_SPEECH_COACH":
      return 65;
    default:
      return 50;
  }
}

function campaignIntentType(campaignId: string): IntentType {
  if (campaignId === "reading_7d") return "START_READING_CHALLENGE";
  if (campaignId === "phonics_14d") return "CONTINUE_PHONICS_CHALLENGE";
  if (campaignId === "healthy_eating_7d") return "CONTINUE_NUTRITION_CHALLENGE";
  return "CONTINUE_CAMPAIGN";
}

function amyLineForIntent(type: IntentType, title: string, childName: string): string {
  switch (type) {
    case "START_READING_CHALLENGE":
      return `You were halfway through the Reading Challenge — pick up where you left off with ${childName}.`;
    case "CONTINUE_PHONICS_CHALLENGE":
      return `Let's continue ${childName}'s phonics challenge from yesterday.`;
    case "CONTINUE_NUTRITION_CHALLENGE":
      return `You started the Healthy Eating Challenge — one small step today keeps the momentum.`;
    case "FINISH_ROUTINE_ITEM":
    case "COMPLETE_ROUTINE":
      return `You still have routine tasks waiting for ${childName} today.`;
    case "CONTINUE_LEARNING_SESSION":
    case "FINISH_LESSON":
      return `${childName}'s learning session is still in progress — ready to finish?`;
    case "REVIEW_WEEKLY_REPORT":
      return `Your weekly family report is ready — see how ${childName}'s week went.`;
    default:
      return `Continue where you left off: ${title}`;
  }
}

/** Derive resumable intents from domain state (campaigns, learning, routines). */
export function deriveIntentsFromContext(ctx: IntentSyncContext): CreateIntentInput[] {
  const derived: CreateIntentInput[] = [];
  const { userId, childId, childName } = ctx;

  if (ctx.campaign) {
    const def = getCampaignById(ctx.campaign.campaignId);
    const stepIndex = Math.max(0, ctx.campaign.currentStep - 1);
    const step = def?.steps[stepIndex] ?? def?.steps[0];
    if (def && step) {
      const action = resolveRoutedAction(
        campaignStepToAction(def.id, step.day, step.deepLink),
      );
      const completedDays = Object.keys(ctx.campaign.stepCompletedAt).length;
      const progressPct = Math.round((completedDays / def.steps.length) * 100);
      const intentType = campaignIntentType(def.id);
      derived.push(
        buildCreateIntentInput({
          userId,
          childId,
          intentType,
          intentSource: "campaign",
          title: step.title,
          subtitle: step.body,
          amyContinuationLine: amyLineForIntent(intentType, def.name, childName),
          actionTarget: action.actionTarget,
          entityId: def.id,
          href: action.path,
          progressPct,
          progressJson: {
            campaignId: def.id,
            stepDay: step.day,
            currentStep: ctx.campaign.currentStep,
          },
          intentPriority: 85,
        }),
      );
    }
  }

  if (ctx.learningSession && ctx.learningSession.stepsCompleted < ctx.learningSession.stepsTotal) {
    const pct = Math.round(
      (ctx.learningSession.stepsCompleted / ctx.learningSession.stepsTotal) * 100,
    );
    derived.push(
      buildCreateIntentInput({
        userId,
        childId,
        intentType: "CONTINUE_LEARNING_SESSION",
        intentSource: "learning",
        title: "Continue today's learning session",
        subtitle: `${ctx.learningSession.stepsCompleted} of ${ctx.learningSession.stepsTotal} steps done`,
        amyContinuationLine: amyLineForIntent("CONTINUE_LEARNING_SESSION", "learning", childName),
        actionTarget: "learning_subject",
        entityId: ctx.learningSession.lastActivityId,
        href: "/parenting-hub",
        progressPct: pct,
        progressJson: {
          sessionId: ctx.learningSession.sessionId,
          lastActivityId: ctx.learningSession.lastActivityId,
        },
        intentPriority: 80,
      }),
    );
  }

  if (ctx.routineTask) {
    const pct = Math.round(
      (ctx.routineTask.completedCount / Math.max(1, ctx.routineTask.totalCount)) * 100,
    );
    derived.push(
      buildCreateIntentInput({
        userId,
        childId,
        intentType: "FINISH_ROUTINE_ITEM",
        intentSource: "routine",
        title: ctx.routineTask.itemTitle,
        subtitle: `${ctx.routineTask.routineTitle} · ${ctx.routineTask.completedCount}/${ctx.routineTask.totalCount} done`,
        amyContinuationLine: amyLineForIntent("FINISH_ROUTINE_ITEM", ctx.routineTask.itemTitle, childName),
        actionTarget: "routine_task",
        entityId: String(ctx.routineTask.routineId),
        href: `/routines/${ctx.routineTask.routineId}`,
        progressPct: pct,
        progressJson: {
          routineId: ctx.routineTask.routineId,
          itemIndex: ctx.routineTask.itemIndex,
        },
        intentPriority: 90,
      }),
    );
  }

  if (ctx.activeGoal && ctx.activeGoal.progress < ctx.activeGoal.targetValue) {
    const pct = Math.round((ctx.activeGoal.progress / ctx.activeGoal.targetValue) * 100);
    derived.push(
      buildCreateIntentInput({
        userId,
        childId,
        intentType: "COMPLETE_GOAL_STEP",
        intentSource: "goal",
        title: `${ctx.activeGoal.goalType} goal in progress`,
        subtitle: `${ctx.activeGoal.progress}/${ctx.activeGoal.targetValue} complete`,
        amyContinuationLine: `You're ${pct}% toward your ${ctx.activeGoal.goalType} goal for ${childName}.`,
        actionTarget: "goal",
        entityId: ctx.activeGoal.goalId,
        href: `/assistant?goalId=${encodeURIComponent(ctx.activeGoal.goalId)}`,
        progressPct: pct,
        progressJson: { goalId: ctx.activeGoal.goalId, goalType: ctx.activeGoal.goalType },
        intentPriority: 70,
      }),
    );
  }

  return derived;
}

export function rankIntents(intents: UserIntent[]): UserIntent[] {
  const now = Date.now();
  return [...intents]
    .filter((i) => isResumableState(i.state) && new Date(i.expiresAt).getTime() > now)
    .sort((a, b) => {
      if (b.intentPriority !== a.intentPriority) return b.intentPriority - a.intentPriority;
      const aInterrupted = a.interruptedAt ? new Date(a.interruptedAt).getTime() : 0;
      const bInterrupted = b.interruptedAt ? new Date(b.interruptedAt).getTime() : 0;
      return bInterrupted - aInterrupted;
    });
}

export function buildContinueJourneyView(intents: UserIntent[]): import("./types.js").ContinueJourneyView {
  const ranked = rankIntents(intents);
  const top = ranked[0] ?? null;
  return {
    hasUnfinished: ranked.length > 0,
    topIntent: top,
    amyLine: top?.amyContinuationLine ?? "",
    allUnfinished: ranked.slice(0, 5),
  };
}

export function smartReminderBody(intent: UserIntent): string {
  if (intent.intentType === "START_READING_CHALLENGE") {
    return "Continue the reading challenge you started yesterday.";
  }
  if (intent.intentType === "CONTINUE_PHONICS_CHALLENGE") {
    return "Pick up the phonics challenge where you left off.";
  }
  if (intent.intentType === "FINISH_ROUTINE_ITEM") {
    return `Finish ${intent.title} — ${intent.subtitle}`;
  }
  if (intent.intentType === "CONTINUE_LEARNING_SESSION") {
    return "Continue the learning session you started.";
  }
  return `Continue: ${intent.title}`;
}

export function intentFromAction(input: {
  userId: string;
  childId?: number | null;
  childName?: string;
  intentSource: CreateIntentInput["intentSource"];
  intentType: IntentType;
  title: string;
  subtitle?: string;
  actionTarget: ActionTarget;
  entityId?: string | null;
  href: string;
  progressPct?: number;
  progressJson?: Record<string, unknown>;
}): CreateIntentInput {
  return buildCreateIntentInput({
    ...input,
    amyContinuationLine: amyLineForIntent(input.intentType, input.title, input.childName ?? "your child"),
  });
}
