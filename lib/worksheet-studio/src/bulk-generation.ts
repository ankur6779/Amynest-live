import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";
import { generateWorksheetLocal } from "./local-generator.js";
import { nextId } from "./renderer/page-layout.js";

export function generateBulkWorksheets(
  base: WorksheetGenerateRequest,
  count: number,
): WorksheetDocument[] {
  const n = Math.min(Math.max(1, count), 50);
  const docs: WorksheetDocument[] = [];
  const usedPrompts = new Set<string>();

  for (let i = 0; i < n; i++) {
    const variant = `${base.prompt} — set ${i + 1} variation ${(i % 7) + 1}`;
    let prompt = variant;
    let attempt = 0;
    while (usedPrompts.has(prompt.toLowerCase()) && attempt < 5) {
      prompt = `${base.prompt} — worksheet ${i + 1} activity ${attempt + 2}`;
      attempt += 1;
    }
    usedPrompts.add(prompt.toLowerCase());

    const doc = generateWorksheetLocal({
      ...base,
      prompt,
      difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : base.difficulty,
      pageCount: base.pageCount,
    });
    doc.id = nextId("bulk");
    doc.meta.title = `${base.prompt} #${i + 1}`;
    docs.push(doc);
  }
  return docs;
}
