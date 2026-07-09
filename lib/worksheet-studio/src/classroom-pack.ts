import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";
import { generateWorksheetLocal } from "./local-generator.js";
import { nextId } from "./renderer/page-layout.js";

export type ClassroomMaterialType =
  | "flashcards"
  | "cutouts"
  | "picture_cards"
  | "word_cards"
  | "activity_sheet"
  | "coloring_sheet"
  | "revision_cards";

export interface ClassroomPackItem {
  type: ClassroomMaterialType;
  label: string;
  document: WorksheetDocument;
}

export interface ClassroomPack {
  id: string;
  topic: string;
  items: ClassroomPackItem[];
  createdAt: string;
}

const MATERIAL_PROMPTS: Record<ClassroomMaterialType, string> = {
  flashcards: "flashcards — picture and word on each card",
  cutouts: "cut and paste activity — printable cut-outs",
  picture_cards: "picture recognition cards",
  word_cards: "vocabulary word cards",
  activity_sheet: "classroom group activity",
  coloring_sheet: "black outline coloring page",
  revision_cards: "quick revision cards",
};

export function generateClassroomPack(req: WorksheetGenerateRequest): ClassroomPack {
  const topic = req.prompt;
  const types = Object.keys(MATERIAL_PROMPTS) as ClassroomMaterialType[];
  const items: ClassroomPackItem[] = types.map((type) => {
    const prompt = `${topic} — ${MATERIAL_PROMPTS[type]}`;
    const document = generateWorksheetLocal({
      ...req,
      prompt,
      pageCount: 1,
      difficulty: type === "revision_cards" ? "medium" : "easy",
    });
    document.meta.title = `${topic} — ${type.replace(/_/g, " ")}`;
    return { type, label: type.replace(/_/g, " "), document };
  });

  return {
    id: nextId("classpack"),
    topic,
    items,
    createdAt: new Date().toISOString(),
  };
}
