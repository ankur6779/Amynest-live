import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  processTutorTurn,
  clearTutorState,
  createTutorState,
} from "./tutorEngine.js";
import { nextFlowPhase, buildExplainMessage } from "./conversationEngine.js";
import { evaluateChildAnswer, generateQuestion } from "./questionEngine.js";
import {
  buildCorrectionResponse,
  nextCorrectionStep,
} from "./errorCorrection.js";
import { adaptTeachingStyle } from "./adaptiveTeaching.js";
import { detectEmotion } from "./emotionAware.js";
import { truncateForSafety, estimateSpeechSeconds } from "./voiceEngine.js";
import { createDefaultPersonalityProfile } from "../ml/personalityEngine.js";
import { createAttentionState } from "../realtime/attentionEngine.js";
import { topicFromContentItem } from "./hybridTutor.js";

const TOPIC = {
  moduleId: "phonics" as const,
  topic: "letter sounds",
  skillLevel: 2,
  difficulty: "easy" as const,
};

describe("conversation flow", () => {
  beforeEach(() => clearTutorState());

  it("explain → ask flow on start", async () => {
    const { response } = await processTutorTurn("t1", {
      action: "start",
      topic: TOPIC,
      childAgeYears: 6,
    });
    assert.equal(response.tutor.mode, "ask");
    assert.equal(response.tutor.nextExpectedResponse, "answer");
    assert.ok(response.tutor.message.length > 0);
    assert.equal(response.tutor.options?.length, 4);
    assert.ok(response.tutor.question);
  });

  it("advances phase after evaluation", () => {
    const state = createTutorState("t2", TOPIC);
    assert.equal(nextFlowPhase(state), "ask");
    assert.equal(nextFlowPhase({ ...state, teachingMode: "ask" }, { correct: true }), "continue");
    assert.equal(nextFlowPhase({ ...state, teachingMode: "ask" }, { correct: false }), "adapt");
  });
});

describe("adaptive teaching", () => {
  it("simplifies when struggling", () => {
    const att = createAttentionState();
    att.focusLevel = 0.3;
    const adaptation = adaptTeachingStyle({
      ctx: TOPIC,
      attention: att,
      recentMistakes: 3,
    });
    assert.equal(adaptation.complexity, "low");
    assert.equal(adaptation.preferredMode, "encourage");
  });

  it("uses game style when bored", () => {
    const att = createAttentionState();
    att.boredomLevel = 0.8;
    const adaptation = adaptTeachingStyle({ ctx: TOPIC, attention: att });
    assert.equal(adaptation.style, "game");
  });

  it("personalizes for high curiosity", () => {
    const p = createDefaultPersonalityProfile("c");
    p.traits.curiosity = 0.9;
    const adaptation = adaptTeachingStyle({ ctx: TOPIC, personality: p });
    assert.equal(adaptation.style, "playful");
  });
});

describe("voice responses", () => {
  it("truncates long text for safety", () => {
    const long = Array.from({ length: 40 }, () => "word").join(" ");
    const short = truncateForSafety(long);
    assert.ok(short.split(/\s+/).length <= 28);
  });

  it("estimates audio under 10 seconds", () => {
    const sec = estimateSpeechSeconds("Let's learn about sounds together.", {
      speed: 0.92,
      childFriendly: true,
      slowMode: false,
      repeatMode: false,
    });
    assert.ok(sec <= 10);
  });

  it("returns voiceUrl on tutor turn", async () => {
    clearTutorState();
    const { response } = await processTutorTurn("tv", { action: "start", topic: TOPIC });
    assert.ok(response.tutor.voiceUrl);
  });
});

describe("error correction", () => {
  it("does not jump to retry before explain and hint", () => {
    const q = generateQuestion(TOPIC, { mistakesHistory: [], strengths: [], weakAreas: [] });
    assert.equal(nextCorrectionStep(1), "explain_why");
    assert.equal(nextCorrectionStep(2), "hint");
    assert.equal(nextCorrectionStep(3), "retry");
    const explain = buildCorrectionResponse(q, "explain_why", 1);
    assert.equal(explain.mode, "correct");
    assert.ok(!explain.message.toLowerCase().includes("the answer is"));
  });

  it("evaluates and corrects wrong answer within 2 interactions", async () => {
    clearTutorState();
    await processTutorTurn("te", { action: "start", topic: TOPIC });
    const { response } = await processTutorTurn("te", {
      action: "answer",
      childAnswer: "idk",
    });
    assert.ok(["correct", "ask", "encourage"].includes(response.tutor.mode));
    assert.ok(
      response.tutor.nextExpectedResponse === "answer" ||
        response.tutor.nextExpectedResponse === "listen",
    );
  });

  it("celebrates correct answer", async () => {
    clearTutorState();
    const start = await processTutorTurn("tc", {
      action: "start",
      topic: TOPIC,
      childAgeYears: 6,
    });
    const correctAnswer =
      start.response.tutor.options?.[start.response.tutor.correctIndex ?? 0] ?? "Ah";
    const { response } = await processTutorTurn("tc", {
      action: "answer",
      childAnswer: correctAnswer,
      childAgeYears: 6,
    });
    assert.equal(response.tutor.mode, "encourage");
  });
});

describe("emotion aware", () => {
  it("detects frustration", () => {
    const att = createAttentionState();
    att.focusLevel = 0.2;
    assert.equal(detectEmotion(att, undefined, 2), "frustration");
  });

  it("wraps explain message for frustration", () => {
    const msg = buildExplainMessage("colors", adaptTeachingStyle({ ctx: TOPIC }), "frustration");
    assert.ok(msg.text.toLowerCase().includes("okay") || msg.text.includes("together"));
  });
});

describe("hybrid content", () => {
  it("introduces content item", async () => {
    clearTutorState();
    const item = {
      slot: "core" as const,
      moduleId: "phonics" as const,
      contentId: "phonics_vowel_a",
      contentType: "learning" as const,
      difficulty: "easy" as const,
    };
    const { response } = await processTutorTurn("th", {
      action: "next_content",
      contentItem: item,
      topic: topicFromContentItem(item, 2),
    });
    assert.ok(response.tutor.message.toLowerCase().includes("phonics"));
  });
});
