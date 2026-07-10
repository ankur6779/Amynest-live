import { describe, expect, it, beforeEach } from "vitest";
import {
  analyzeReferenceLocal,
  enhancePromptLocal,
  generateWorksheetLocal,
  getPostGenerationRecommendations,
  getQualityBreakdown,
  groupPromptHistory,
  parseCopilotCommand,
  scoreLivePrompt,
  starsLabel,
  summarizeDocumentChanges,
  tryConversationalEdit,
  type PromptHistoryEntry,
} from "@workspace/worksheet-studio";
import { getAiAnalyticsDashboard, recordStudioAnalytics } from "@workspace/worksheet-studio/client";

function sampleDoc() {
  return generateWorksheetLocal({
    prompt: "Sea animals worksheet with fish and dolphin",
    classLevel: "ukg",
    subject: "evs",
    difficulty: "easy",
    pageCount: 2,
  });
}

describe("prompt quality engine v6.2", () => {
  it("scores a rich prompt as excellent", () => {
    const q = scoreLivePrompt({
      prompt: "Create a 2-page UKG sea animals worksheet with matching, tracing, and print-friendly outline images",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 2,
      enhancedPrompt: enhancePromptLocal({
        prompt: "Sea animals",
        classLevel: "ukg",
        subject: "evs",
        difficulty: "easy",
        pageCount: 2,
      }),
      referenceCount: 1,
      analysis: { topic: "Sea Animals", confidence: 85 },
    });
    expect(q.stars).toBeGreaterThanOrEqual(4);
    expect(q.scorePercent).toBeGreaterThanOrEqual(80);
    expect(q.included).toContain("Topic");
    expect(starsLabel(q.stars)).toContain("★");
  });

  it("suggests improvements for sparse prompts", () => {
    const q = scoreLivePrompt({
      prompt: "animals",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    });
    expect(q.suggestions.length).toBeGreaterThan(0);
    expect(q.scorePercent).toBeLessThan(88);
  });
});

describe("vision reference analysis v6.2", () => {
  it("detects class, subject, and topic from filename", () => {
    const analysis = analyzeReferenceLocal({
      id: "ref1",
      filename: "LPS_Topic_Sea_Animals_UKG.pdf",
      kind: "pdf",
      mimeType: "application/pdf",
      sizeBytes: 5000,
      pageCount: 2,
      layoutHints: ["bordered", "header"],
      textSnippet: "Topic – Sea Animals\nClass UKG",
    });
    expect(analysis.classLevel).toBe("ukg");
    expect(analysis.subject).toBe("evs");
    expect(analysis.topic?.toLowerCase()).toContain("sea");
    expect(analysis.pageCount).toBe(2);
    expect(analysis.confidence).toBeGreaterThan(50);
  });
});

describe("conversational editor v6.2", () => {
  it("enlarges images in place", () => {
    const doc = sampleDoc();
    const beforeImg = doc.pages.flatMap((p) => p.elements).find((e) => e.type === "image" || (e.type === "question_block" && e.illustrationSrc));
    const result = tryConversationalEdit("Make images larger", doc);
    expect(result).not.toBeNull();
    expect(result!.summary).toContain("Enlarged");
    expect(result!.document.version).toBe(doc.version + 1);
    if (beforeImg?.type === "image" && result) {
      const afterImg = result.document.pages.flatMap((p) => p.elements).find((e) => e.type === "image");
      if (afterImg?.type === "image") {
        expect(afterImg.width).toBeGreaterThanOrEqual(beforeImg.width);
      }
    }
  });

  it("replaces text across worksheet", () => {
    const doc = sampleDoc();
    const result = tryConversationalEdit("Replace fish with dolphin", doc);
    expect(result).not.toBeNull();
    const text = JSON.stringify(result!.document);
    expect(text.toLowerCase()).toContain("dolphin");
  });

  it("summarizes document changes", () => {
    const doc = sampleDoc();
    const edited = tryConversationalEdit("Add one more matching activity", doc);
    expect(edited).not.toBeNull();
    const summary = summarizeDocumentChanges(doc, edited!.document);
    expect(summary.changedElements).toBeGreaterThan(0);
    expect(summary.highlights.length).toBeGreaterThan(0);
  });

  it("parses copilot edit kind", () => {
    const doc = sampleDoc();
    const result = parseCopilotCommand("Make images larger", doc);
    expect(result.kind).toBe("edit");
    if (result.kind === "edit") {
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.document.version).toBeGreaterThan(doc.version);
    }
  });
});

describe("quality breakdown v6.2", () => {
  it("returns extended scores after generation", () => {
    const doc = sampleDoc();
    const breakdown = getQualityBreakdown(doc);
    expect(breakdown.overall).toBeGreaterThan(0);
    expect(breakdown.educational).toBeGreaterThan(0);
    expect(breakdown.print).toBeGreaterThan(0);
    expect(breakdown.visual).toBeGreaterThan(0);
    expect(breakdown.bloomCoverage).toBeGreaterThan(0);
  });
});

describe("post-generation recommendations v6.2", () => {
  it("offers one-tap variants", () => {
    const doc = sampleDoc();
    const recs = getPostGenerationRecommendations(doc);
    expect(recs.length).toBeGreaterThanOrEqual(6);
    expect(recs.some((r) => r.id === "homework")).toBe(true);
    expect(recs.some((r) => r.id === "assessment")).toBe(true);
  });
});

describe("smart prompt history v6.2", () => {
  const entries: PromptHistoryEntry[] = [
    {
      id: "a",
      prompt: "Sea animals",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 2,
      favorite: true,
      createdAt: "2026-07-10T10:00:00.000Z",
    },
    {
      id: "b",
      prompt: "Math counting",
      classLevel: "lkg",
      subject: "math",
      difficulty: "easy",
      pageCount: 1,
      favorite: false,
      createdAt: "2026-07-09T10:00:00.000Z",
    },
  ];

  it("groups by subject, class, and favorites", () => {
    const grouped = groupPromptHistory(entries);
    expect(grouped.favorites).toHaveLength(1);
    expect(grouped.recent[0]?.id).toBe("a");
    expect(grouped.bySubject.evs).toHaveLength(1);
    expect(grouped.byClass.ukg).toHaveLength(1);
  });
});

describe("prompt enhancer v2", () => {
  it("includes Bloom, learning objectives, and LPS standards", () => {
    const out = enhancePromptLocal({
      prompt: "Fruits worksheet",
      classLevel: "lkg",
      subject: "english",
      difficulty: "easy",
      pageCount: 1,
    });
    expect(out).toContain("Bloom");
    expect(out).toContain("Learning objectives");
    expect(out).toContain("LUCKNOW PUBLIC SCHOOL");
    expect(out).toContain("Print optimization");
  });
});

describe("AI analytics dashboard v6.2", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("worksheet-studio-analytics-v1");
    }
  });

  it("tracks vision, enhance, and quality events", () => {
    recordStudioAnalytics("worksheet_prompt_enhance");
    recordStudioAnalytics("worksheet_vision_analyze", { count: 1 });
    recordStudioAnalytics("worksheet_generate_start", { promptLength: 120, subject: "evs" });
    recordStudioAnalytics("worksheet_generate_done", { qualityScore: 92, subject: "evs", classLevel: "ukg" });
    recordStudioAnalytics("worksheet_copilot_edit");

    const dash = getAiAnalyticsDashboard();
    expect(dash.promptEnhancements).toBe(1);
    expect(dash.visionAnalyses).toBe(1);
    expect(dash.avgPromptLength).toBe(120);
    expect(dash.avgWorksheetScore).toBe(92);
    expect(dash.copilotEdits).toBe(1);
  });
});
