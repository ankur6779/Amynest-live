import type { WorksheetGenerateRequest } from "./types.js";

export interface WorksheetTemplate {
  id: string;
  name: string;
  emoji: string;
  category: "class" | "subject" | "activity";
  request: WorksheetGenerateRequest;
}

export const WORKSHEET_TEMPLATES: WorksheetTemplate[] = [
  { id: "nursery-colour", name: "Colouring", emoji: "🎨", category: "activity", request: { prompt: "Nursery colouring worksheet with simple shapes", classLevel: "nursery", subject: "drawing", difficulty: "easy", pageCount: 1 } },
  { id: "lkg-trace", name: "Tracing", emoji: "✏️", category: "activity", request: { prompt: "LKG tracing worksheet for letters A to E", classLevel: "lkg", subject: "english", difficulty: "easy", pageCount: 1 } },
  { id: "ukg-match", name: "Matching", emoji: "🔗", category: "activity", request: { prompt: "UKG match the pictures worksheet", classLevel: "ukg", subject: "english", difficulty: "easy", pageCount: 1 } },
  { id: "ukg-circle", name: "Circle", emoji: "⭕", category: "activity", request: { prompt: "UKG circle the correct answer worksheet", classLevel: "ukg", subject: "english", difficulty: "easy", pageCount: 1 } },
  { id: "ukg-pattern", name: "Pattern", emoji: "🔁", category: "activity", request: { prompt: "UKG complete the pattern worksheet", classLevel: "ukg", subject: "math", difficulty: "medium", pageCount: 1 } },
  { id: "g1-writing", name: "Writing", emoji: "📝", category: "activity", request: { prompt: "Grade 1 writing practice sentences", classLevel: "grade1", subject: "english", difficulty: "medium", pageCount: 2 } },
  { id: "g1-reading", name: "Reading", emoji: "📖", category: "activity", request: { prompt: "Grade 1 short reading comprehension", classLevel: "grade1", subject: "english", difficulty: "medium", pageCount: 2 } },
  { id: "g2-math", name: "Math Practice", emoji: "🔢", category: "activity", request: { prompt: "Grade 2 addition and subtraction 1-50", classLevel: "grade2", subject: "math", difficulty: "medium", pageCount: 2 } },
  { id: "nursery", name: "Nursery", emoji: "🧸", category: "class", request: { prompt: "Nursery fun learning worksheet", classLevel: "nursery", subject: "english", difficulty: "easy", pageCount: 1 } },
  { id: "lkg", name: "LKG", emoji: "🌟", category: "class", request: { prompt: "LKG practice worksheet", classLevel: "lkg", subject: "english", difficulty: "easy", pageCount: 1 } },
  { id: "ukg", name: "UKG", emoji: "🎒", category: "class", request: { prompt: "UKG practice worksheet", classLevel: "ukg", subject: "english", difficulty: "easy", pageCount: 1 } },
  { id: "grade1", name: "Grade 1", emoji: "📚", category: "class", request: { prompt: "Grade 1 practice worksheet", classLevel: "grade1", subject: "english", difficulty: "medium", pageCount: 2 } },
  { id: "grade2", name: "Grade 2", emoji: "🏫", category: "class", request: { prompt: "Grade 2 practice worksheet", classLevel: "grade2", subject: "english", difficulty: "medium", pageCount: 2 } },
  { id: "english", name: "English", emoji: "🔤", category: "subject", request: { prompt: "English vocabulary and sentences", classLevel: "ukg", subject: "english", difficulty: "easy", pageCount: 1 } },
  { id: "hindi", name: "Hindi", emoji: "🇮🇳", category: "subject", request: { prompt: "Hindi Swar worksheet", classLevel: "lkg", subject: "hindi", difficulty: "easy", pageCount: 1 } },
  { id: "math", name: "Math", emoji: "➕", category: "subject", request: { prompt: "Addition 1-20 worksheet", classLevel: "ukg", subject: "math", difficulty: "easy", pageCount: 1 } },
  { id: "evs", name: "EVS", emoji: "🌿", category: "subject", request: { prompt: "EVS plants and animals worksheet", classLevel: "grade1", subject: "evs", difficulty: "easy", pageCount: 1 } },
  { id: "gk", name: "GK", emoji: "🌍", category: "subject", request: { prompt: "General knowledge worksheet for kids", classLevel: "grade2", subject: "gk", difficulty: "medium", pageCount: 1 } },
  { id: "phonics", name: "Phonics", emoji: "🔊", category: "subject", request: { prompt: "Beginning sounds phonics worksheet", classLevel: "lkg", subject: "phonics", difficulty: "easy", pageCount: 1 } },
];

export function getTemplateById(id: string): WorksheetTemplate | undefined {
  return WORKSHEET_TEMPLATES.find((t) => t.id === id);
}
