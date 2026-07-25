import { beforeEach, describe, expect, it } from "vitest";
import {
  enrichWithKnowledge,
  evaluateQuality,
  isGenericResponse,
  KNOWLEDGE_SCENARIOS,
  resolveAgeBand,
  scenarioPrompt,
  themeFromPrompt,
  type KnowledgeContext,
} from "./knowledge-intelligence";
import {
  __resetGuideMemoryForTests,
  classifyPrompt,
  planConversationTurn,
  rememberConversationTurn,
  runQualityPass,
  simulateGuideResponse,
  type ChartGrounding,
} from "./conversation-intelligence";
import { __resetReplyMemoryForTests } from "./reply-memory";

const SCHOOL_AGE_CHART: ChartGrounding = {
  childName: "Aanya",
  sunSign: "Leo",
  moonSign: "Cancer",
  risingSign: "Virgo",
  moonPhaseLabel: "Waxing Crescent",
  daySky: false,
  birthDate: "2017-03-12", // ~school age in 2026
};

const TODDLER_CHART: ChartGrounding = {
  ...SCHOOL_AGE_CHART,
  birthDate: "2024-09-01",
};

const TEEN_CHART: ChartGrounding = {
  ...SCHOOL_AGE_CHART,
  birthDate: "2011-01-15",
};

function baseCtx(
  question: string,
  chart: ChartGrounding = SCHOOL_AGE_CHART,
  turn = 0,
): KnowledgeContext {
  return {
    childName: chart.childName,
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    risingSign: chart.risingSign,
    moonPhaseLabel: chart.moonPhaseLabel,
    daySky: chart.daySky,
    birthDate: chart.birthDate,
    question,
    promptKind: classifyPrompt(question),
    turnCount: turn,
  };
}

describe("knowledge intelligence", () => {
  beforeEach(() => {
    __resetGuideMemoryForTests();
    __resetReplyMemoryForTests();
  });

  it("resolves age bands from birth date", () => {
    expect(resolveAgeBand("2024-09-01", new Date("2026-07-25"))).toBe("toddler");
    expect(resolveAgeBand("2021-01-01", new Date("2026-07-25"))).toBe("preschool");
    expect(resolveAgeBand("2017-03-12", new Date("2026-07-25"))).toBe("school");
    expect(resolveAgeBand("2011-01-15", new Date("2026-07-25"))).toBe("teen");
    expect(resolveAgeBand(null)).toBe("unknown");
  });

  it("maps scenarios to knowledge themes", () => {
    expect(themeFromPrompt("friends at playground", "friendship")).toBe("friendships");
    expect(themeFromPrompt("I'm worried about new places", "concern")).toBe("anxiety");
    expect(themeFromPrompt("morning routine falling apart", "general")).toBe("routines");
  });

  it("scrubs unsafe destiny / illness / money claims", () => {
    const out = enrichWithKnowledge(
      "Aanya is destined to be a star and will get illness from stress. She will be rich.",
      baseCtx("What about her future?"),
    );
    expect(out.body).not.toMatch(/destined to be a star/i);
    expect(out.body).not.toMatch(/will get illness/i);
    expect(out.body).not.toMatch(/will be rich/i);
    expect(out.checks.safe).toBe(true);
  });

  it("adds practical guidance for important parenting questions", () => {
    const out = enrichWithKnowledge(
      "Moon themes can colour evenings.",
      baseCtx("What should I do when Aanya melts down after school?"),
    );
    expect(out.body).toMatch(/What parents can try/i);
    expect(out.applied).toContain("practical");
    expect(out.checks.actionable).toBe(true);
  });

  it("age-adjusts practical examples", () => {
    const toddlerQ = "How can I build Aanya's confidence?";
    const teenQ = toddlerQ;
    const toddler = enrichWithKnowledge(
      "Sun in Leo can frame vitality.",
      baseCtx(toddlerQ, TODDLER_CHART),
    );
    const teen = enrichWithKnowledge(
      "Sun in Leo can frame vitality.",
      baseCtx(teenQ, TEEN_CHART),
    );
    expect(toddler.body).toMatch(/toddler|toy|try/i);
    expect(teen.body).toMatch(/Want ideas|listener|permission|teen|dignity|Ask permission/i);
    expect(toddler.body).not.toEqual(teen.body);
  });

  it("labels astronomy vs traditional when fused", () => {
    const out = enrichWithKnowledge(
      "Belonging matters for Aanya.",
      baseCtx("Can you explain what her Moon means traditionally?"),
    );
    expect(out.body).toMatch(/Astronomy/i);
    expect(out.body).toMatch(/Traditional interpretation/i);
  });

  it("runs scenario evaluation suite — flags remaining generics", () => {
    const profileId = "knowledge-suite";
    const genericFlags: Array<{ scenario: string; reason: string }> = [];
    const qualityGaps: Array<{ scenario: string; fails: string[] }> = [];

    for (const scenario of KNOWLEDGE_SCENARIOS) {
      const question = scenarioPrompt(scenario, "Aanya");
      const planned = planConversationTurn({
        profileId,
        question,
        chart: SCHOOL_AGE_CHART,
      });
      const mem = {
        turnCount: 0,
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
              question,
              chart: SCHOOL_AGE_CHART,
              rhythm: planned.rhythm === "local_followup" ? "answer_direct" : planned.rhythm,
              pattern: planned.pattern,
              mem,
            });

      // Inject a generic chatbot blob to prove rewrite
      const injected =
        planned.kind === "stream"
          ? `${raw}\n\nEvery child is different. Trust the journey. As an AI, certainly!`
          : raw;

      const polished = runQualityPass({
        profileId,
        body: injected,
        question,
        chart: SCHOOL_AGE_CHART,
        rhythm: planned.kind === "local_guide" ? "answer_direct" : planned.rhythm,
        pattern: planned.pattern,
      });

      rememberConversationTurn({
        profileId,
        question,
        reply: polished.body,
        rhythm: planned.rhythm,
        pattern: planned.pattern,
      });

      expect(polished.body).not.toMatch(/as an ai|destined to|will be rich/i);

      if (planned.kind !== "local_guide") {
        expect(polished.body).toMatch(/What parents can try/i);
        expect(polished.body).toMatch(/Aanya/);
      }

      if (isGenericResponse(polished.body)) {
        genericFlags.push({ scenario, reason: "generic_signature" });
      }

      const { fails } = evaluateQuality(polished.body, baseCtx(question, SCHOOL_AGE_CHART, 2));
      if (fails.length) {
        qualityGaps.push({ scenario, fails });
      }
    }

    expect(KNOWLEDGE_SCENARIOS).toHaveLength(10);
    // Suite should leave no generics after knowledge pass
    expect(genericFlags).toEqual([]);
    // Allow at most soft gaps (e.g. short local turns) — none for forced answer_direct path
    const hardGaps = qualityGaps.filter((g) =>
      g.fails.some((f) => ["safe", "actionable", "personal"].includes(f)),
    );
    expect(hardGaps).toEqual([]);

    if (qualityGaps.length) {
      // eslint-disable-next-line no-console
      console.info("[knowledge suite] soft quality gaps:", qualityGaps);
    }
  });
});
