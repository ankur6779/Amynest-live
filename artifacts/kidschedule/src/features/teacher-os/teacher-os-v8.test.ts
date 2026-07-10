import { describe, expect, it } from "vitest";
import {
  generateTeachingPack,
  teachingPackDocuments,
  teachingPackSummary,
  generateDailyLessonPlan,
  parseNaturalLessonRequest,
  parseLessonChatIntent,
  lessonChatResponse,
  loadCurriculumMemory,
  suggestNextTopic,
  searchTeachingPack,
  getTeacherOsAnalytics,
  recordTeacherOsEvent,
  isTeacherOsModuleEnabled,
  listEnabledTeacherOsModules,
  KNOWLEDGE_BASE,
  getPostLessonRecommendations,
} from "@workspace/teacher-os";

describe("Teacher OS v8.0", () => {
  it("enables production modules by default", () => {
    expect(isTeacherOsModuleEnabled("dashboard")).toBe(true);
    expect(isTeacherOsModuleEnabled("studio")).toBe(true);
    expect(isTeacherOsModuleEnabled("monthly_curriculum")).toBe(false);
    expect(listEnabledTeacherOsModules().length).toBeGreaterThanOrEqual(8);
  });

  it("parses natural lesson request from Amy command", () => {
    const parsed = parseNaturalLessonRequest("I have to teach Sea Animals tomorrow to UKG");
    expect(parsed.topic?.toLowerCase()).toContain("sea");
    expect(parsed.classLevel).toBe("ukg");
    expect(parsed.date).toBeTruthy();
  });

  it("generates complete teaching pack for one topic", () => {
    const pack = generateTeachingPack({
      prompt: "Sea Animals",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    });
    expect(pack.topic).toBe("Sea Animals");
    expect(pack.lessonPlan.timeline.length).toBeGreaterThanOrEqual(5);
    expect(pack.homeworkPack.worksheet).toBeDefined();
    expect(pack.classroomPack.items.length).toBeGreaterThan(0);
    expect(pack.parentMessages.whatsapp).toContain("Sea Animals");
    expect(teachingPackDocuments(pack).length).toBeGreaterThan(5);
    expect(teachingPackSummary(pack).length).toBeGreaterThan(2);
  });

  it("generates daily lesson plan with timeline", () => {
    const plan = generateDailyLessonPlan({
      date: "2026-07-11",
      classLevel: "ukg",
      subject: "evs",
      topic: "Sea Animals",
      difficulty: "easy",
    });
    expect(plan.estimatedMinutes).toBeGreaterThan(30);
    expect(plan.timeline.some((t) => t.label === "Warm-up")).toBe(true);
    expect(plan.learningObjectives.length).toBeGreaterThan(0);
  });

  it("handles lesson chat intents", () => {
    const intent = parseLessonChatIntent("Create tomorrow's lesson on Sea Animals for UKG");
    expect(intent.action).toBe("create_lesson");
    expect(lessonChatResponse(intent)).toContain("Sea Animals");
  });

  it("tracks curriculum memory and suggestions", () => {
    const memory = loadCurriculumMemory();
    expect(memory.pendingTopics.length).toBeGreaterThan(0);
    expect(suggestNextTopic("ukg", 2).length).toBeGreaterThan(0);
  });

  it("searches teaching pack by topic", () => {
    const pack = generateTeachingPack({
      prompt: "Sea Animals",
      classLevel: "ukg",
      subject: "evs",
      difficulty: "easy",
      pageCount: 1,
    });
    const results = searchTeachingPack(pack, "sea");
    expect(results.some((r) => r.type === "lesson_plan")).toBe(true);
    expect(results.some((r) => r.type === "worksheet")).toBe(true);
    expect(results.some((r) => r.type === "parent_message")).toBe(true);
  });

  it("records analytics events", () => {
    const before = getTeacherOsAnalytics().lessonsCreated;
    recordTeacherOsEvent("lesson");
    expect(getTeacherOsAnalytics().lessonsCreated).toBeGreaterThanOrEqual(before + 1);
  });

  it("exposes knowledge base frameworks", () => {
    expect(KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(6);
    expect(KNOWLEDGE_BASE.some((k) => k.id === "nep_2020")).toBe(true);
  });

  it("suggests post-lesson recommendations", () => {
    const recs = getPostLessonRecommendations("Sea Animals");
    expect(recs.some((r) => r.label === "Homework")).toBe(true);
    expect(recs.some((r) => r.module === "parent_communication")).toBe(true);
  });
});
