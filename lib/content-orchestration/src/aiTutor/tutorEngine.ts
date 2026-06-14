import type { AttentionState } from "../realtime/types.js";
import type { PersonalityProfile } from "../ml/types-personality.js";
import type { PredictionOutput } from "../ml/types-prediction.js";
import type { SessionPlanItem } from "../types-v2.js";
import {
  createSessionGoal,
  createInitialGoalProgress,
  updateGoalProgress,
  isSessionGoalMet,
} from "./sessionGoals.js";
import {
  getTutorMemory,
  saveTutorMemory,
  updateMemoryFromEvaluation,
} from "./tutorMemory.js";
import {
  generateQuestion,
  generateRetryQuestion,
  evaluateChildAnswer,
} from "./questionEngine.js";
import {
  buildCorrectionResponse,
  nextCorrectionStep,
  shouldGiveUpAfterAttempts,
  encouragementAfterManyTries,
} from "./errorCorrection.js";
import { adaptTeachingStyle } from "./adaptiveTeaching.js";
import { detectEmotion, buildEmotionAwareMessage } from "./emotionAware.js";
import {
  buildExplainMessage,
  buildAskMessage,
  buildEncourageMessage,
  appendTurn,
  markMicroCycle,
  shouldStartMicroCycle,
} from "./conversationEngine.js";
import {
  textToSpeech,
  resolveVoiceSettings,
  truncateForSafety,
} from "./voiceEngine.js";
import { topicFromContentItem, hybridIntroMessage, alignTutorWithContent } from "./hybridTutor.js";
import type {
  TutorState,
  TutorResponsePayload,
  TutorApiPayload,
  TopicContext,
} from "./types.js";
import { TUTOR_SAFETY } from "./types.js";

const tutorByChild = new Map<string, TutorState>();
const wrongAttempts = new Map<string, number>();
const lastQuestion = new Map<string, import("./questionEngine.js").GeneratedQuestion>();
const seenQuestionIds = new Map<string, string[]>();

export type TutorContext = {
  personality?: PersonalityProfile;
  prediction?: PredictionOutput;
  attention?: AttentionState;
};

export function createTutorState(
  childId: string,
  ctx: TopicContext,
  contentItem?: SessionPlanItem,
): TutorState {
  const state: TutorState = {
    childId,
    currentTopic: ctx.topic,
    currentSkillLevel: ctx.skillLevel,
    conversationHistory: [],
    teachingMode: "explain",
    sessionGoal: createSessionGoal(ctx),
    goalProgress: createInitialGoalProgress(),
    memory: getTutorMemory(childId),
    cycleCount: 0,
    lastCycleAt: Date.now(),
    contentItem,
  };
  tutorByChild.set(childId, state);
  wrongAttempts.set(childId, 0);
  return state;
}

export function getTutorState(childId: string): TutorState | undefined {
  return tutorByChild.get(childId);
}

export function clearTutorState(childId?: string): void {
  if (childId) {
    tutorByChild.delete(childId);
    wrongAttempts.delete(childId);
    lastQuestion.delete(childId);
    seenQuestionIds.delete(childId);
  } else {
    tutorByChild.clear();
    wrongAttempts.clear();
    lastQuestion.clear();
    seenQuestionIds.clear();
  }
}

async function toApiPayload(
  state: TutorState,
  message: string,
  mode: TutorState["teachingMode"],
  nextExpectedResponse: TutorResponsePayload["nextExpectedResponse"],
  tutorCtx?: TutorContext,
  voiceOpts?: { slowMode?: boolean; repeatMode?: boolean },
  mcq?: { question?: string; options?: string[]; correctIndex?: number },
): Promise<TutorApiPayload> {
  const speakText =
    mcq?.question && mcq.question.trim().length > 0
      ? truncateForSafety(`${message} ${mcq.question}`)
      : message;
  const voice = await textToSpeech(
    speakText,
    resolveVoiceSettings({
      slowMode: voiceOpts?.slowMode,
      repeatMode: voiceOpts?.repeatMode,
      personalityDistractibility: tutorCtx?.personality?.traits.distractibility,
    }),
  );
  if (voice.durationEstimateSec > TUTOR_SAFETY.maxAudioSeconds) {
    message = truncateForSafety(message);
  }
  return {
    tutor: {
      message,
      voiceUrl: voice.audioUrl,
      mode,
      nextExpectedResponse,
      slowMode: voiceOpts?.slowMode,
      question: mcq?.question,
      options: mcq?.options,
      correctIndex: mcq?.correctIndex,
    },
  };
}

function rememberQuestion(childId: string, question: import("./questionEngine.js").GeneratedQuestion): void {
  lastQuestion.set(childId, question);
  const seen = seenQuestionIds.get(childId) ?? [];
  seenQuestionIds.set(childId, [...seen, question.bankId].slice(-12));
}

function nextQuestion(
  childId: string,
  ctx: TopicContext,
  memory: TutorState["memory"],
  ageYears: number,
): import("./questionEngine.js").GeneratedQuestion {
  const question = generateQuestion(
    ctx,
    memory,
    wrongAttempts.get(childId) ?? 0,
    ageYears,
    seenQuestionIds.get(childId) ?? [],
  );
  rememberQuestion(childId, question);
  return question;
}

/**
 * Start or continue tutor — explain → ask → evaluate → adapt micro-loop.
 */
export async function processTutorTurn(
  childId: string,
  input: {
    action: "start" | "answer" | "repeat" | "next_content";
    topic?: TopicContext;
    contentItem?: SessionPlanItem;
    childAnswer?: string;
    audioInput?: string;
    childAgeYears?: number;
  },
  tutorCtx: TutorContext = {},
): Promise<{ state: TutorState; response: TutorApiPayload; goalMet: boolean }> {
  let state = getTutorState(childId);
  const ageYears = Math.max(2, Math.min(15, input.childAgeYears ?? 6));
  const ctx =
    input.topic ??
    (input.contentItem
      ? topicFromContentItem(input.contentItem, state?.currentSkillLevel ?? 2)
      : {
          moduleId: "phonics" as const,
          topic: "learning",
          skillLevel: 2,
          difficulty: "easy" as const,
        });

  if (!state || input.action === "start") {
    state = createTutorState(childId, ctx, input.contentItem);
  }

  if (input.contentItem && input.action === "next_content") {
    state = alignTutorWithContent(state, input.contentItem);
    const intro = hybridIntroMessage(input.contentItem);
    state = appendTurn(state, "amy", intro, "explain");
    return {
      state,
      response: await toApiPayload(state, intro, "explain", "listen", tutorCtx),
      goalMet: false,
    };
  }

  const adaptation = adaptTeachingStyle({
    ctx,
    personality: tutorCtx.personality,
    prediction: tutorCtx.prediction,
    attention: tutorCtx.attention,
    recentMistakes: wrongAttempts.get(childId) ?? 0,
  });

  const emotion = detectEmotion(
    tutorCtx.attention,
    undefined,
    wrongAttempts.get(childId) ?? 0,
  );

  if (input.action === "repeat") {
    const last = [...state.conversationHistory].reverse().find((t) => t.role === "amy");
    const text = last?.text ?? "Let's try again.";
    const question = lastQuestion.get(childId);
    return {
      state,
      response: await toApiPayload(state, text, state.teachingMode, question ? "answer" : "listen", tutorCtx, {
        repeatMode: true,
        slowMode: true,
      }, question ? {
        question: question.prompt,
        options: [...question.options],
        correctIndex: question.correctIndex,
      } : undefined),
      goalMet: false,
    };
  }

  if (input.action === "answer") {
    let answer = input.childAnswer?.trim() ?? "";
    if (!answer && input.audioInput) {
      const { speechToText } = await import("./voiceEngine.js");
      answer = await speechToText(input.audioInput);
    }
    state = appendTurn(state, "child", answer || "…");

    const question = lastQuestion.get(childId);
    if (!question) {
      const fallback = buildEncourageMessage(emotion, adaptation);
      state = appendTurn(state, "amy", fallback.text, fallback.mode);
      return {
        state: markMicroCycle(state),
        response: await toApiPayload(
          state,
          fallback.text,
          fallback.mode,
          "answer",
          tutorCtx,
        ),
        goalMet: false,
      };
    }

    const evaluation = evaluateChildAnswer(answer, question);
    state.memory = updateMemoryFromEvaluation(state.memory, ctx.topic, evaluation);
    saveTutorMemory(childId, state.memory);
    state.goalProgress = updateGoalProgress(state.goalProgress, {
      correct: evaluation.correct,
      engagementHint: evaluation.correct ? 0.75 : 0.45,
    });

    if (evaluation.correct) {
      wrongAttempts.set(childId, 0);
      const successEmotion = detectEmotion(tutorCtx.attention, evaluation, 0);
      const msg = buildEmotionAwareMessage(
        successEmotion,
        "Yes! You got it!",
      );
      state = appendTurn(state, "amy", msg, "encourage");
      state.teachingMode = "encourage";
      tutorByChild.set(childId, markMicroCycle(state));
      return {
        state,
        response: await toApiPayload(state, msg, "encourage", "continue", tutorCtx),
        goalMet: isSessionGoalMet(state),
      };
    }

    const attempts = (wrongAttempts.get(childId) ?? 0) + 1;
    wrongAttempts.set(childId, attempts);

    if (shouldGiveUpAfterAttempts(attempts)) {
      const giveUp = encouragementAfterManyTries();
      state = appendTurn(state, "amy", giveUp.message, giveUp.mode);
      tutorByChild.set(childId, state);
      return {
        state,
        response: await toApiPayload(
          state,
          giveUp.message,
          giveUp.mode,
          giveUp.nextExpectedResponse,
          tutorCtx,
        ),
        goalMet: false,
      };
    }

    const step = nextCorrectionStep(attempts);
    const correction = buildCorrectionResponse(question, step, attempts);
    let mcq: { question?: string; options?: string[]; correctIndex?: number } | undefined;
    if (step === "retry") {
      const retryQ = generateRetryQuestion(question, attempts, ageYears);
      rememberQuestion(childId, retryQ);
      correction.message = truncateForSafety(`${correction.message} ${retryQ.prompt}`);
      mcq = {
        question: retryQ.prompt,
        options: [...retryQ.options],
        correctIndex: retryQ.correctIndex,
      };
    }
    state = appendTurn(state, "amy", correction.message, correction.mode);
    state.teachingMode = correction.mode;
    tutorByChild.set(childId, markMicroCycle(state));
    return {
      state,
      response: await toApiPayload(
        state,
        correction.message,
        correction.mode,
        correction.nextExpectedResponse,
        tutorCtx,
        { slowMode: true },
        mcq,
      ),
      goalMet: false,
    };
  }

  // explain → ask cycle
  if (state.teachingMode === "explain" || shouldStartMicroCycle(state)) {
    const explain = buildExplainMessage(ctx.topic, adaptation, emotion);
    state = appendTurn(state, "amy", explain.text, explain.mode);
    state.teachingMode = "explain";

    const question = nextQuestion(childId, ctx, state.memory, ageYears);
    const ask = buildAskMessage(question, adaptation);
    state = appendTurn(state, "amy", ask.text, ask.mode);
    state.teachingMode = "ask";
    tutorByChild.set(childId, markMicroCycle(state));

    return {
      state,
      response: await toApiPayload(state, explain.text, "ask", "answer", tutorCtx, undefined, {
        question: question.prompt,
        options: [...question.options],
        correctIndex: question.correctIndex,
      }),
      goalMet: false,
    };
  }

  const question = nextQuestion(childId, ctx, state.memory, ageYears);
  const askOnly = buildAskMessage(question, adaptation);
  state = appendTurn(state, "amy", askOnly.text, "ask");
  state.teachingMode = "ask";
  tutorByChild.set(childId, state);

  return {
    state,
    response: await toApiPayload(state, askOnly.text, "ask", "answer", tutorCtx, undefined, {
      question: question.prompt,
      options: [...question.options],
      correctIndex: question.correctIndex,
    }),
    goalMet: false,
  };
}

export async function startTutorForContent(
  childId: string,
  contentItem: SessionPlanItem,
  skillLevel: number,
  tutorCtx?: TutorContext,
): Promise<{ state: TutorState; response: TutorApiPayload }> {
  const result = await processTutorTurn(
    childId,
    {
      action: "next_content",
      contentItem,
      topic: topicFromContentItem(contentItem, skillLevel),
    },
    tutorCtx,
  );
  return { state: result.state, response: result.response };
}
