import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeBirthSkyModel, resolveBirthSkyModelCatalog } from "./ai-model-router.js";

describe("routeBirthSkyModel (weighted)", () => {
  it("routes planet / meaning questions to fast", () => {
    const d = routeBirthSkyModel({ userText: "What does the Moon mean in their chart?" });
    assert.equal(d.tier, "fast");
  });

  it("routes deep anxiety + school guidance to reasoning", () => {
    const d = routeBirthSkyModel({
      userText: "How can I help with their anxiety at school?",
    });
    assert.equal(d.tier, "reasoning");
    assert.ok(d.escalated);
  });

  it("routes reflection always to reasoning", () => {
    const d = routeBirthSkyModel({ userText: "Help me write a reflection for this week." });
    assert.equal(d.tier, "reasoning");
    assert.equal(d.reason, "reflection");
  });

  it("routes keepsake to reasoning", () => {
    const d = routeBirthSkyModel({ userText: "Create a keepsake paragraph for print." });
    assert.equal(d.tier, "reasoning");
  });

  it("does NOT escalate short follow-ups solely because of many prior turns", () => {
    const d = routeBirthSkyModel({
      userText: "ok",
      priorTurnCount: 12,
      recentTurns: [
        { role: "user", body: "Explain their Sun sign briefly." },
        { role: "assistant", body: "Their Sun is about warmth and initiative." },
      ],
      priorTier: "fast",
    });
    assert.equal(d.tier, "fast");
    assert.equal(d.reason, "quick_followup");
  });

  it("holds reasoning during an active deep thread (no quality downgrade)", () => {
    const d = routeBirthSkyModel({
      userText: "What else can I try at bedtime with their sibling jealousy?",
      priorTurnCount: 4,
      priorTier: "reasoning",
      recentTurns: [
        {
          role: "user",
          body: "What should I do about sibling jealousy and bedtime meltdowns?",
        },
        {
          role: "assistant",
          body: "Stay calm, validate both kids, and keep the routine predictable.",
        },
      ],
    });
    assert.equal(d.tier, "reasoning");
    assert.match(d.reason, /stickiness|score:/);
  });

  it("keeps light tip questions on fast", () => {
    const d = routeBirthSkyModel({
      userText: "Parenting tip for transitions?",
    });
    assert.equal(d.tier, "fast");
  });

  it("starts new conversations on fast by default", () => {
    const d = routeBirthSkyModel({
      userText: "What is Day Sky?",
      priorTurnCount: 0,
    });
    assert.equal(d.tier, "fast");
  });

  it("uses env catalog models", () => {
    const cat = resolveBirthSkyModelCatalog();
    assert.ok(cat.fast.length > 0);
    assert.ok(cat.reasoning.length > 0);
  });
});
