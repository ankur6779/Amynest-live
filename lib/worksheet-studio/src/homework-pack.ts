import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";
import { generateWorksheetLocal } from "./local-generator.js";
import { generateAnswerKeyDocument } from "./answer-key-engine.js";
import { generateWorksheetVariant } from "./teacher-productivity.js";
import { nextId } from "./renderer/page-layout.js";
import { applyLanguageToDocument } from "./i18n-engine.js";

export interface HomeworkPack {
  id: string;
  topic: string;
  packGroupId: string;
  worksheet: WorksheetDocument;
  answerKey: WorksheetDocument;
  homework: WorksheetDocument;
  parent: WorksheetDocument;
  revision: WorksheetDocument;
  assessment: WorksheetDocument;
  createdAt: string;
}

export function generateHomeworkPackFromRequest(req: WorksheetGenerateRequest): HomeworkPack {
  const worksheet = generateWorksheetLocal(req);
  return generateHomeworkPackFromDocument(worksheet);
}

export function generateHomeworkPackFromDocument(worksheet: WorksheetDocument): HomeworkPack {
  const groupId = nextId("pack");
  const answerKey = generateAnswerKeyDocument(worksheet);
  const homework = generateWorksheetVariant(worksheet, "homework");
  const revision = generateWorksheetVariant(worksheet, "revision");
  const assessment = generateWorksheetVariant(worksheet, "assessment");
  const parent = applyLanguageToDocument(
    {
      ...structuredClone(homework),
      id: nextId("parent"),
      meta: {
        ...homework.meta,
        title: `${homework.meta.title} — Parent Guide`,
        topic: `${homework.meta.topic} (Parent)`,
      },
    },
    "bilingual",
  );

  [worksheet, answerKey, homework, parent, revision, assessment].forEach((d) => {
    d.prompt = `${d.prompt} [pack:${groupId}]`;
  });

  return {
    id: nextId("hwpack"),
    topic: worksheet.meta.topic,
    packGroupId: groupId,
    worksheet,
    answerKey,
    homework,
    parent,
    revision,
    assessment,
    createdAt: new Date().toISOString(),
  };
}
