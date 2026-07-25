/**
 * Real 50-prompt evaluation harness for Amy Astro client intelligence.
 * Proves polish + hydrate survival + variety metrics in-repo.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetGuideMemoryForTests,
  classifyPrompt,
  planConversationTurn,
  rememberConversationTurn,
  runQualityPass,
  scoreRepetition,
  simulateGuideResponse,
  type ChartGrounding,
} from "./conversation-intelligence";
import { __resetReplyMemoryForTests } from "./reply-memory";
import {
  __resetPolishedMessageStoreForTests,
  applyPolishedBodies,
  savePolishedMessage,
} from "./polished-message-store";

export const EVALUATION_PROMPTS_50 = [
  "What does this mean?",
  "What should I do?",
  "I'm worried.",
  "Tell me more.",
  "Can you explain?",
  "Give examples.",
  "Hi",
  "How can I support bedtime?",
  "She melts down after school — what helps?",
  "Is her shyness something to worry about?",
  "How does curiosity show up?",
  "Friends at the playground feel hard.",
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
  "Please go deep on learning style, emotions, and peers.",
  "What does this mean for behaviour at dinner?",
  "How do I help with homework without fighting?",
  "He hides when relatives visit.",
  "She compares herself to classmates.",
  "What helps after a hard teacher comment?",
  "How do we rebuild mornings that keep falling apart?",
  "I'm worried he doesn't have close friends.",
  "Can you explain the difference between astronomy and tradition here?",
  "Give examples of noticing effort without praise overload.",
  "Tell me more about independence for a school-age child.",
  "What should I do when curiosity turns into endless why questions?",
  "She refuses the bedtime story suddenly.",
  "How can I support confidence before a recital?",
  "He gets angry when losing games.",
  "Is Day Sky different from a full chart?",
  "What parenting try helps after school exhaustion?",
  "Explain belonging without predicting popularity.",
  "Short answer: how do I start tonight?",
  "Longer concern: she's anxious, tired from school, and snap-py at dinner — where do I begin without overwhelming her?",
  "What does the Moon phase label mean for routines?",
  "How do I protect creativity on busy weekdays?",
] as const;

const CHART: ChartGrounding = {
  childName: "Aanya",
  sunSign: "Leo",
  moonSign: "Cancer",
  risingSign: "Virgo",
  moonPhaseLabel: "Waxing Crescent",
  daySky: false,
  birthDate: "2017-03-12",
};

describe("conversation evaluation harness (50 prompts)", () => {
  beforeEach(() => {
    __resetGuideMemoryForTests();
    __resetReplyMemoryForTests();
    __resetPolishedMessageStoreForTests();
  });

  it("evaluates 50 prompts with polish surviving hydrate and low repetition", () => {
    expect(EVALUATION_PROMPTS_50).toHaveLength(50);

    const profileId = "eval-50";
    const bodies: string[] = [];
    const kinds = new Set<string>();
    const rhythms = new Set<string>();

    for (let i = 0; i < EVALUATION_PROMPTS_50.length; i++) {
      const prompt = EVALUATION_PROMPTS_50[i]!;
      kinds.add(classifyPrompt(prompt));
      const planned = planConversationTurn({
        profileId,
        question: prompt,
        chart: CHART,
      });
      rhythms.add(planned.rhythm);

      const mem = {
        turnCount: i,
        lastTopics: [],
        lastThemes: [],
        lastQuestions: [],
        lastEndings: [],
        lastTransitions: [],
        lastAdvice: [],
        lastMetaphors: [],
        lastPatterns: [],
        lastRhythms: [],
        lastFollowUps: [],
        style: "warm" as const,
      };

      const raw =
        planned.kind === "local_guide"
          ? planned.body
          : simulateGuideResponse({
              question: prompt,
              chart: CHART,
              rhythm:
                planned.rhythm === "local_followup" ? "answer_direct" : planned.rhythm,
              pattern: planned.pattern,
              mem,
            });

      const polished = runQualityPass({
        profileId,
        body: raw,
        question: prompt,
        chart: CHART,
        rhythm: planned.kind === "local_guide" ? "local_followup" : planned.rhythm,
        pattern: planned.pattern,
      });

      const messageId = `asst_${i}`;
      savePolishedMessage(profileId, messageId, polished.body);

      // Simulate hydrate replacing with "server" raw text
      const afterHydrate = applyPolishedBodies(profileId, [
        { messageId, role: "assistant", body: raw },
      ]);
      expect(afterHydrate[0]!.body).toBe(polished.body);

      rememberConversationTurn({
        profileId,
        question: prompt,
        reply: polished.body,
        rhythm: planned.rhythm,
        pattern: planned.pattern,
      });

      bodies.push(polished.body);
      expect(polished.body).not.toMatch(/\bas an ai\b|destined to|will be rich/i);
      expect(polished.body.toLowerCase()).not.toMatch(
        /today'?s live sky is their birth chart|birth chart is today'?s sky/i,
      );
    }

    expect(kinds.size).toBeGreaterThanOrEqual(8);
    expect(rhythms.size).toBeGreaterThanOrEqual(2);

    const rep = scoreRepetition(bodies);
    expect(rep.openingCollisionRate).toBeLessThan(0.15);
    expect(rep.endingCollisionRate).toBeLessThan(0.2);

    // eslint-disable-next-line no-console
    console.info("[eval-50]", {
      prompts: bodies.length,
      kinds: kinds.size,
      rhythms: rhythms.size,
      openingCollisionRate: rep.openingCollisionRate,
      endingCollisionRate: rep.endingCollisionRate,
      flaggedPairs: rep.flaggedPairs.length,
    });
  });
});
