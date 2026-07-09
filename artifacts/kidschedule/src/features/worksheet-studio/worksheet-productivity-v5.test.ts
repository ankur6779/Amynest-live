import { describe, expect, it } from "vitest";
import {
  generateWorksheetLocal,
  generateWeeklyPlan,
  generateHomeworkPackFromRequest,
  generateClassroomPack,
  generateBulkWorksheets,
  getSmartRecommendations,
  suggestNextTopics,
  topicPrompt,
  markTopicCompleted,
  getCurriculumProgress,
  applyLanguageToDocument,
  getSchoolBranding,
  setSchoolBranding,
  applyBrandingToDocument,
  duplicateWorksheetDocument,
} from "@workspace/worksheet-studio";
import {
  getAnalyticsDashboard,
  recordStudioAnalytics,
} from "@workspace/worksheet-studio/client";

const baseReq = {
  prompt: "UKG sea animals fish dolphin",
  classLevel: "ukg" as const,
  subject: "evs" as const,
  difficulty: "easy" as const,
  pageCount: 1,
};

describe("weekly planner", () => {
  it("generates five unique weekday worksheets", () => {
    const plan = generateWeeklyPlan(baseReq);
    expect(plan.days).toHaveLength(5);
    const prompts = plan.days.map((d) => d.request.prompt);
    expect(new Set(prompts).size).toBe(5);
    for (const day of plan.days) {
      expect(day.document.pages.length).toBeGreaterThan(0);
    }
  });
});

describe("homework pack", () => {
  it("creates linked worksheet bundle", () => {
    const pack = generateHomeworkPackFromRequest(baseReq);
    expect(pack.worksheet.id).not.toBe(pack.answerKey.id);
    expect(pack.homework.meta.topic).toBeTruthy();
    expect(pack.parent.prompt).toContain("pack:");
    expect(pack.assessment.pages.length).toBeGreaterThan(0);
  });
});

describe("classroom pack", () => {
  it("generates multiple material types", () => {
    const pack = generateClassroomPack(baseReq);
    expect(pack.items.length).toBeGreaterThanOrEqual(5);
    expect(pack.items.every((i) => i.document.pages.length > 0)).toBe(true);
  });
});

describe("bulk generation", () => {
  it("creates unique worksheets up to count", () => {
    const docs = generateBulkWorksheets(baseReq, 5);
    expect(docs).toHaveLength(5);
    const titles = docs.map((d) => d.meta.title);
    expect(new Set(titles).size).toBe(5);
  });

  it("caps at 50 worksheets", () => {
    const docs = generateBulkWorksheets(baseReq, 100);
    expect(docs.length).toBeLessThanOrEqual(50);
  });
});

describe("curriculum engine", () => {
  it("suggests uncompleted topics", () => {
    const before = suggestNextTopics("ukg", 3);
    expect(before.length).toBeGreaterThan(0);
    markTopicCompleted(before[0]!.id, "ukg");
    const after = suggestNextTopics("ukg", 3);
    expect(after.some((t) => t.id === before[0]!.id)).toBe(false);
    expect(getCurriculumProgress().completed.length).toBeGreaterThan(0);
  });

  it("builds class-aware topic prompts", () => {
    const topic = suggestNextTopics("lkg", 1)[0]!;
    const prompt = topicPrompt(topic, "lkg");
    expect(prompt.toLowerCase()).toContain("lkg");
  });
});

describe("recommendations", () => {
  it("returns variant and curriculum suggestions", () => {
    const doc = generateWorksheetLocal(baseReq);
    const entry = {
      id: doc.id,
      documentId: doc.id,
      title: doc.meta.title,
      topic: doc.meta.topic,
      tags: [],
      folder: "My Worksheets",
      favorite: false,
      archived: false,
      trashed: false,
      document: doc,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const recs = getSmartRecommendations([entry], doc);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.kind === "homework")).toBe(true);
  });
});

describe("i18n engine", () => {
  it("applies hindi and bilingual without losing pages", () => {
    const doc = generateWorksheetLocal(baseReq);
    const hindi = applyLanguageToDocument(doc, "hindi");
    const bilingual = applyLanguageToDocument(doc, "bilingual");
    expect(hindi.pages.length).toBe(doc.pages.length);
    expect(bilingual.pages.length).toBe(doc.pages.length);
  });
});

describe("school branding", () => {
  it("applies branding to document meta", () => {
    setSchoolBranding({ schoolName: "Test School", primaryColor: "#112233" });
    const branding = getSchoolBranding();
    expect(branding.schoolName).toBe("Test School");
    const doc = applyBrandingToDocument(generateWorksheetLocal(baseReq));
    expect(doc.meta.title).toBeTruthy();
  });
});

describe("analytics", () => {
  it("records events and builds dashboard", () => {
    recordStudioAnalytics("worksheet_generate_done", { source: "local" });
    const dash = getAnalyticsDashboard();
    expect(dash.worksheetsCreated).toBeGreaterThanOrEqual(0);
    expect(typeof dash.exports).toBe("number");
  });
});

describe("teacher library helpers", () => {
  it("duplicates documents with new ids", () => {
    const doc = generateWorksheetLocal(baseReq);
    const copy = duplicateWorksheetDocument(doc);
    expect(copy.id).not.toBe(doc.id);
    expect(copy.meta.title).toContain("Copy");
  });
});
