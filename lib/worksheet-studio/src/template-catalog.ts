import type { WorksheetClass, WorksheetDifficulty, WorksheetGenerateRequest, WorksheetSubject } from "./types.js";
import type { WorksheetTemplate } from "./templates.js";
import { WORKSHEET_TEMPLATES as BASE_TEMPLATES } from "./templates.js";

export type TemplateCategory =
  | "tracing" | "coloring" | "matching" | "math" | "phonics" | "reading" | "hindi"
  | "evs" | "gk" | "writing" | "patterns" | "animals" | "transport" | "festivals"
  | "seasons" | "habits" | "shapes" | "alphabet" | "numbers" | "class" | "subject" | "activity";

const CLASSES: WorksheetClass[] = ["nursery", "lkg", "ukg", "grade1", "grade2"];
const SUBJECTS: WorksheetSubject[] = ["english", "math", "evs", "hindi", "gk", "phonics", "drawing"];
const DIFFICULTIES: WorksheetDifficulty[] = ["easy", "medium", "hard"];

const TOPIC_MATRIX: Array<{ cat: TemplateCategory; emoji: string; topics: string[] }> = [
  { cat: "tracing", emoji: "✏️", topics: ["Letters A-E", "Letters F-J", "Numbers 1-10", "Shapes tracing", "Hindi Swar trace"] },
  { cat: "coloring", emoji: "🎨", topics: ["Animals coloring", "Fruits coloring", "Flowers", "Transport", "Festivals"] },
  { cat: "matching", emoji: "🔗", topics: ["Picture match", "Shadow match", "Number match", "Rhyme match"] },
  { cat: "math", emoji: "🔢", topics: ["Addition 1-10", "Addition 1-20", "Subtraction", "Counting", "Patterns", "Greater than"] },
  { cat: "phonics", emoji: "🔊", topics: ["Beginning sounds", "CVC words", "Rhyming words", "Blends", "Digraphs"] },
  { cat: "reading", emoji: "📖", topics: ["Sight words", "Short sentences", "Picture comprehension", "Story sequence"] },
  { cat: "hindi", emoji: "🇮🇳", topics: ["Swar", "Vyanjan", "Matra practice", "Hindi words"] },
  { cat: "evs", emoji: "🌿", topics: ["Plants", "Animals", "My body", "Food", "Water"] },
  { cat: "gk", emoji: "🌍", topics: ["India", "Flags", "Community helpers", "Good manners"] },
  { cat: "writing", emoji: "📝", topics: ["Sentence writing", "Paragraph", "Copy work", "Dictation prep"] },
  { cat: "patterns", emoji: "🔁", topics: ["AB pattern", "Color pattern", "Number pattern", "Shape pattern"] },
  { cat: "animals", emoji: "🐠", topics: ["Sea animals", "Farm animals", "Wild animals", "Pet animals", "Birds"] },
  { cat: "transport", emoji: "🚌", topics: ["Land transport", "Air transport", "Water transport", "Road safety"] },
  { cat: "festivals", emoji: "🪔", topics: ["Diwali", "Holi", "Eid", "Christmas", "Independence Day"] },
  { cat: "seasons", emoji: "🌦️", topics: ["Summer", "Monsoon", "Winter", "Spring", "Seasonal clothes"] },
  { cat: "habits", emoji: "⭐", topics: ["Good habits", "Hygiene", "Healthy food", "Exercise", "Kindness"] },
  { cat: "shapes", emoji: "⬛", topics: ["Circle", "Square", "Triangle", "Rectangle", "Mixed shapes"] },
  { cat: "alphabet", emoji: "🔤", topics: ["Letter A", "Letter B", "Letter C", "Uppercase", "Lowercase"] },
  { cat: "numbers", emoji: "🔢", topics: ["Number 1", "Numbers 1-5", "Numbers 1-10", "Number names"] },
];

function subjectForCategory(cat: TemplateCategory): WorksheetSubject {
  const map: Partial<Record<TemplateCategory, WorksheetSubject>> = {
    math: "math", hindi: "hindi", phonics: "phonics", evs: "evs", gk: "gk",
    coloring: "drawing", tracing: "english", writing: "english", reading: "english",
  };
  return map[cat] ?? "english";
}

function classForIndex(i: number): WorksheetClass {
  return CLASSES[i % CLASSES.length]!;
}

function generatedTemplates(): WorksheetTemplate[] {
  const out: WorksheetTemplate[] = [];
  let idx = 0;
  for (const row of TOPIC_MATRIX) {
    for (const topic of row.topics) {
      for (const cls of CLASSES) {
        if (out.length >= 120) break;
        const diff = DIFFICULTIES[idx % 3]!;
        out.push({
          id: `tpl-${row.cat}-${idx}`,
          name: topic,
          emoji: row.emoji,
          category: row.cat === "class" || row.cat === "subject" || row.cat === "activity" ? row.cat : "activity",
          request: {
            prompt: `${cls.toUpperCase()} ${topic} worksheet`,
            classLevel: cls,
            subject: subjectForCategory(row.cat),
            difficulty: diff,
            pageCount: cls === "grade1" || cls === "grade2" ? 2 : 1,
          },
        });
        idx += 1;
      }
    }
  }
  return out;
}

const GENERATED = generatedTemplates();

export const WORKSHEET_TEMPLATE_CATALOG: WorksheetTemplate[] = [
  ...BASE_TEMPLATES,
  ...GENERATED.filter((g) => !BASE_TEMPLATES.some((b) => b.name === g.name && b.request.classLevel === g.request.classLevel)),
];

export function searchTemplates(query: string): WorksheetTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return WORKSHEET_TEMPLATE_CATALOG;
  return WORKSHEET_TEMPLATE_CATALOG.filter(
    (t) => t.name.toLowerCase().includes(q) || t.request.prompt.toLowerCase().includes(q) || t.category.includes(q),
  );
}

export function getTemplatesByCategory(cat: string): WorksheetTemplate[] {
  return WORKSHEET_TEMPLATE_CATALOG.filter((t) => t.category === cat || t.request.subject === cat);
}

export const TEMPLATE_CATEGORIES = [...new Set(WORKSHEET_TEMPLATE_CATALOG.map((t) => t.category))];
