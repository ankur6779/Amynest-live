import type { WorksheetDocument, WorksheetLanguage } from "./types.js";

export type { WorksheetLanguage };

export function applyLanguageToDocument(doc: WorksheetDocument, lang: WorksheetLanguage): WorksheetDocument {
  const out = structuredClone(doc);
  out.meta.updatedAt = new Date().toISOString();

  for (const page of out.pages) {
    for (const el of page.elements) {
      if (el.type === "text") {
        if (lang === "hindi") el.content = toHindiHint(el.content);
        else if (lang === "bilingual") el.content = `${el.content} / ${toHindiHint(el.content)}`;
        else el.content = el.content.replace(/^(\[हिंदी\]\s*|\[EN\]\s*)/, "");
      }
      if (el.type === "question_block") {
        if (lang === "hindi") el.prompt = toHindiHint(el.prompt);
        else if (lang === "bilingual") el.prompt = `${el.prompt}\n${toHindiHint(el.prompt)}`;
        else el.prompt = el.prompt.replace(/^(\[हिंदी\]\s*)/, "");
      }
    }
  }
  return out;
}

function toHindiHint(text: string): string {
  const map: Record<string, string> = {
    Circle: "घेरा लगाएं",
    Colour: "रंग भरें",
    Color: "रंग भरें",
    Match: "मिलान करें",
    Trace: "लिखें",
    Count: "गिनें",
    Write: "लिखें",
    Name: "नाम",
    Class: "कक्षा",
    Date: "दिनांक",
  };
  let out = text;
  for (const [en, hi] of Object.entries(map)) {
    out = out.replace(new RegExp(en, "gi"), hi);
  }
  if (out === text && !text.includes("हिंदी")) return `[हिंदी] ${text}`;
  return out;
}
