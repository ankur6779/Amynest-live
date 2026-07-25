import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetGuideMemoryForTests,
  buildSessionContinuity,
  classifyPrompt,
  chooseRhythm,
  extractTheme,
  loadGuideMemory,
  planConversationTurn,
  rememberConversationTurn,
  runQualityPass,
  scoreRepetition,
  simulateGuideResponse,
  type ChartGrounding,
} from "./conversation-intelligence";
import { __resetReplyMemoryForTests } from "./reply-memory";

const CHART: ChartGrounding = {
  childName: "Aanya",
  sunSign: "Leo",
  moonSign: "Cancer",
  risingSign: "Virgo",
  moonPhaseLabel: "Waxing Crescent",
  daySky: false,
};

const DAY_SKY: ChartGrounding = {
  ...CHART,
  risingSign: null,
  daySky: true,
};

/** 30 parent prompts across required domains */
export const CONVERSATION_PROMPTS_30 = [
  "What does this mean?",
  "What should I do?",
  "I'm worried.",
  "Tell me more.",
  "Can you explain?",
  "Give examples.",
  "Hi",
  "How can I support bedtime for Aanya?",
  "She melts down after school — what helps?",
  "Is her shyness something to worry about?",
  "How does curiosity show up for her?",
  "Friends at the playground feel hard for her.",
  "She won't try drawing unless it's perfect.",
  "Some nights she wakes and can't settle.",
  "He talks back when I ask him to get ready.",
  "Explain her Moon in plain language.",
  "What does Sun in Leo mean for confidence?",
  "Give me examples for gentle mornings.",
  "I'm worried about her friendships.",
  "Tell me more about emotional expression.",
  "What should I do when she freezes in new rooms?",
  "Can you explain Rising without being mystical?",
  "School focus is uneven this month.",
  "How do I celebrate small creative wins?",
  "She's anxious before birthday parties.",
  "Ok",
  "We've talked about sleep before — anything new?",
  "I want a short answer about belonging.",
  "Please go deep: learning style, emotions, and how peers meet her at school over long paragraphs of context that a parent might type when they're tired and need thoughtful counsel without fluff.",
  "What does this mean for her behaviour at dinner?",
] as const;

describe("conversation intelligence", () => {
  beforeEach(() => {
    __resetGuideMemoryForTests();
    __resetReplyMemoryForTests();
  });

  it("classifies question types distinctly", () => {
    expect(classifyPrompt("I'm worried.")).toBe("concern");
    expect(classifyPrompt("What should I do?")).toBe("action");
    expect(classifyPrompt("Tell me more.")).toBe("more");
    expect(classifyPrompt("Give examples.")).toBe("examples");
    expect(classifyPrompt("School focus is uneven")).toBe("school");
    expect(classifyPrompt("Hi")).toBe("short");
  });

  it("rotates rhythm and avoids stacking local follow-ups", () => {
    const profileId = "rhythm-1";
    const r1 = chooseRhythm("I'm worried.", loadGuideMemory(profileId));
    rememberConversationTurn({
      profileId,
      question: "I'm worried.",
      reply: "Is it evenings or school?",
      rhythm: r1,
      pattern: "question_first",
    });
    const r2 = chooseRhythm("I'm worried again.", loadGuideMemory(profileId));
    if (r1 === "local_followup") {
      expect(r2).not.toBe("local_followup");
    }
  });

  it("builds session continuity only from stored history", () => {
    expect(buildSessionContinuity("empty", "Aanya")).toBeNull();
    rememberConversationTurn({
      profileId: "cont-1",
      question: "How does curiosity show up?",
      reply: "Curiosity often softens when play is unhurried.",
      rhythm: "answer_direct",
      pattern: "observation_first",
      planets: ["Sun", "Moon"],
    });
    const line = buildSessionContinuity("cont-1", "Aanya");
    expect(line).toMatch(/curiosity|Sun|Moon|explored/i);
  });

  it("quality pass rewrites repeated openings and softens robotic tone", () => {
    const profileId = "qual-1";
    const first = runQualityPass({
      profileId,
      body: "Looking at their chart, confidence grows in small stages. Try witnessing effort.",
      question: "What about confidence?",
      chart: CHART,
      rhythm: "answer_direct",
      pattern: "short",
    });
    const second = runQualityPass({
      profileId,
      body: "Looking at their chart, belonging matters too. As an AI, certainly! Try witnessing effort again.",
      question: "What about belonging?",
      chart: CHART,
      rhythm: "reflect_first",
      pattern: "reflection",
    });
    expect(second.body.startsWith("Looking at their chart")).toBe(false);
    expect(second.body).not.toMatch(/as an ai/i);
    expect(second.flags.length).toBeGreaterThan(0);
    expect(first.body.length).toBeGreaterThan(10);
  });

  it("never invents Rising in Day Sky grounding", () => {
    const out = runQualityPass({
      profileId: "day-1",
      body: "Their Rising in Aries makes them bold in every room.",
      question: "What about new rooms?",
      chart: DAY_SKY,
      rhythm: "answer_direct",
      pattern: "narrative",
    });
    expect(out.body).toMatch(/Rising isn’t available in Day Sky|Day Sky/i);
  });

  it("runs a 30-prompt suite with variety and low repetition", () => {
    const profileId = "suite-30";
    const bodies: string[] = [];
    const rhythms = new Set<string>();
    const patterns = new Set<string>();
    const themes = new Set<string>();
    const kinds = new Set<string>();

    for (const prompt of CONVERSATION_PROMPTS_30) {
      const planned = planConversationTurn({
        profileId,
        question: prompt,
        chart: CHART,
      });
      rhythms.add(planned.rhythm);
      patterns.add(planned.pattern);
      kinds.add(planned.promptKind);
      themes.add(extractTheme(prompt));

      const mem = loadGuideMemory(profileId);
      const raw =
        planned.kind === "local_guide"
          ? planned.body
          : simulateGuideResponse({
              question: prompt,
              chart: CHART,
              rhythm: planned.rhythm,
              pattern: planned.pattern,
              mem,
            });

      // Inject a repetitive model-like opening on every 5th stream answer to prove rewrite.
      const injected =
        planned.kind === "stream" && bodies.length % 5 === 0
          ? `Looking at their chart, ${raw}`
          : raw;

      const polished = runQualityPass({
        profileId,
        body: injected,
        question: prompt,
        chart: CHART,
        rhythm: planned.rhythm,
        pattern: planned.pattern,
      });

      rememberConversationTurn({
        profileId,
        question: prompt,
        reply: polished.body,
        rhythm: planned.rhythm,
        pattern: planned.pattern,
        planets: ["Sun", "Moon", "Rising"],
      });

      bodies.push(polished.body);

      expect(polished.body.trim().length).toBeGreaterThan(8);
      expect(polished.body).not.toMatch(/as an ai|destiny|fated/i);
      // Guide voice: either chart-grounded or a human follow-up question.
      expect(
        /Aanya|Sun|Moon|Leo|Cancer|Virgo|sky|chart|gentle|soft|notice|hear|explore|worr|example|belong|curios|sleep|school|friend|creat|confiden|emotion|behav|Rising|Day Sky|evening|room|play|reflection|parenting|\?/i.test(
          polished.body,
        ),
      ).toBe(true);
    }

    expect(CONVERSATION_PROMPTS_30).toHaveLength(30);
    expect(rhythms.size).toBeGreaterThanOrEqual(3);
    expect(patterns.size).toBeGreaterThanOrEqual(4);
    expect(kinds.size).toBeGreaterThanOrEqual(8);
    expect(themes.size).toBeGreaterThanOrEqual(8);

    const rep = scoreRepetition(bodies);
    // Pairwise opening collisions should stay uncommon across 30 varied turns.
    expect(rep.openingCollisionRate).toBeLessThan(0.12);
    expect(rep.endingCollisionRate).toBeLessThan(0.18);

    // Surface remaining flags for the report (not a hard fail unless severe).
    if (rep.flaggedPairs.length > 0) {
      // eslint-disable-next-line no-console
      console.info(
        "[amy-astro conversation suite] remaining repetition pairs:",
        rep.flaggedPairs.slice(0, 6),
        {
          openingCollisionRate: rep.openingCollisionRate,
          endingCollisionRate: rep.endingCollisionRate,
        },
      );
    }
  });

  it("local guide turns ask rather than lecture", () => {
    const planned = planConversationTurn({
      profileId: "local-1",
      question: "I'm worried.",
      chart: CHART,
    });
    // First vague turn is usually a follow-up question.
    if (planned.kind === "local_guide") {
      expect(planned.body).toContain("?");
      expect(planned.body.length).toBeLessThan(420);
    } else {
      expect(["reflect_first", "answer_direct", "invite_explore"]).toContain(planned.rhythm);
    }
  });
});
