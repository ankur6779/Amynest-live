import {
  CLASS_LABELS,
  SUBJECT_LABELS,
  generateClassroomPack,
  generateHomeworkPackFromRequest,
} from "@workspace/worksheet-studio";
import type { GenerateTeachingPackInput, ParentMessageSet, TeachingPack } from "./types.js";
import { generateDailyLessonPlan } from "./daily-planner-engine.js";
import { generateParentMessages } from "./parent-communication.js";

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTeachingPack(input: GenerateTeachingPackInput): TeachingPack {
  const topic = input.prompt.trim();
  const homeworkPack = generateHomeworkPackFromRequest(input);
  const classroomPack = generateClassroomPack(input);
  const lessonPlan = generateDailyLessonPlan({
    date: input.date ?? new Date().toISOString().slice(0, 10),
    classLevel: input.classLevel,
    subject: input.subject,
    topic,
    difficulty: input.difficulty,
  });
  const parentMessages = generateParentMessages({
    topic,
    classLevel: input.classLevel,
    subject: input.subject,
    language: input.parentLanguage ?? "bilingual",
  });

  return {
    id: uid("tpack"),
    topic,
    classLevel: input.classLevel,
    subject: input.subject,
    difficulty: input.difficulty,
    lessonPlan,
    homeworkPack,
    classroomPack,
    parentMessages,
    worksheets: {
      printable: homeworkPack.worksheet,
      homework: homeworkPack.homework,
      assessment: homeworkPack.assessment,
      revision: homeworkPack.revision,
      answerKey: homeworkPack.answerKey,
    },
    createdAt: new Date().toISOString(),
  };
}

export function teachingPackSummary(pack: TeachingPack): string[] {
  return [
    `Lesson plan for ${CLASS_LABELS[pack.classLevel]} ${SUBJECT_LABELS[pack.subject]}`,
    `${pack.lessonPlan.timeline.length} timed activities`,
    `${pack.classroomPack.items.length} classroom materials`,
    "Homework, assessment, revision & answer key",
    "Parent messages (EN + HI)",
  ];
}

export function teachingPackDocuments(pack: TeachingPack) {
  const docs = [
    pack.worksheets.printable,
    pack.worksheets.homework,
    pack.worksheets.assessment,
    pack.worksheets.revision,
    pack.worksheets.answerKey,
    ...pack.classroomPack.items.map((i) => i.document),
  ];
  return docs;
}
