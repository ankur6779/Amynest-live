import { CLASS_LABELS, SUBJECT_LABELS } from "@workspace/worksheet-studio";
import type { DailyLessonPlan, LessonTimelineSlot } from "./types.js";
import type { WorksheetClass, WorksheetDifficulty, WorksheetSubject } from "@workspace/worksheet-studio";

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface DailyPlanInput {
  date: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  topic: string;
  difficulty: WorksheetDifficulty;
}

function buildTimeline(topic: string, classLevel: WorksheetClass): LessonTimelineSlot[] {
  const classLabel = CLASS_LABELS[classLevel];
  return [
    { id: "warmup", label: "Warm-up", durationMinutes: 5, description: `Greeting song and quick recap of yesterday's ${topic} activity.`, materials: ["Flashcards"] },
    { id: "intro", label: "Introduction", durationMinutes: 10, description: `Show picture cards for ${topic}. Ask children what they already know.`, materials: ["Picture cards", "Blackboard"] },
    { id: "teach", label: "Teaching", durationMinutes: 15, description: `Teacher models key concepts for ${topic} using blackboard notes and oral questions.`, materials: ["Charts", "Blackboard"] },
    { id: "activity", label: "Activity", durationMinutes: 15, description: `Hands-on circle time activity — matching, tracing, or colouring related to ${topic}.`, materials: ["Worksheets", "Crayons"] },
    { id: "worksheet", label: "Worksheet", durationMinutes: 10, description: `Individual printable worksheet practice for ${classLabel}.`, materials: ["Printable worksheet"] },
    { id: "discussion", label: "Discussion", durationMinutes: 5, description: "Children share one thing they learned.", materials: [] },
    { id: "homework", label: "Homework", durationMinutes: 3, description: "Explain take-home sheet to children; note for parents.", materials: ["Homework sheet"] },
    { id: "assessment", label: "Quick Assessment", durationMinutes: 5, description: "Oral questions to check understanding.", materials: [] },
    { id: "reflection", label: "Reflection", durationMinutes: 2, description: "Teacher notes what went well and what needs revision.", materials: ["Teacher diary"] },
  ];
}

export function generateDailyLessonPlan(input: DailyPlanInput): DailyLessonPlan {
  const timeline = buildTimeline(input.topic, input.classLevel);
  const estimatedMinutes = timeline.reduce((s, t) => s + t.durationMinutes, 0);
  const subjectLabel = SUBJECT_LABELS[input.subject];

  return {
    id: uid("dplan"),
    date: input.date,
    classLevel: input.classLevel,
    subject: input.subject,
    topic: input.topic,
    difficulty: input.difficulty,
    timeline,
    learningObjectives: [
      `Children can name key ideas about ${input.topic}.`,
      `Children can complete age-appropriate ${subjectLabel} activities.`,
      `Children develop fine motor skills through tracing/writing.`,
      `Children can answer simple oral questions about ${input.topic}.`,
    ],
    materialsRequired: [
      "Flashcards",
      "Picture cards",
      "Printable worksheet",
      "Homework sheet",
      "Crayons / pencils",
      "Blackboard / whiteboard",
    ],
    circleTimeQuestions: [
      `What do you know about ${input.topic}?`,
      `Can you point to a picture of ${input.topic}?`,
      `Which activity did you enjoy most today?`,
    ],
    blackboardNotes: [
      `Topic: ${input.topic}`,
      `Class: ${CLASS_LABELS[input.classLevel]}`,
      `Key words: [write 4–6 vocabulary words]`,
      `Today's activity: worksheet + oral practice`,
    ],
    oralQuestions: [
      `What is the topic today? (${input.topic})`,
      `Can you name one thing about ${input.topic}?`,
      `Which picture matches the word?`,
    ],
    reflectionPrompt: `Did ${CLASS_LABELS[input.classLevel]} children understand ${input.topic}? Note weak areas for revision.`,
    estimatedMinutes,
    createdAt: new Date().toISOString(),
  };
}
