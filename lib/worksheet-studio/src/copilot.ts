import type { WorksheetDocument, WorksheetGenerateRequest, WorksheetImproveAction } from "./types.js";

export type CopilotResult =
  | { kind: "action"; action: WorksheetImproveAction }
  | { kind: "regenerate"; request: Partial<WorksheetGenerateRequest> }
  | { kind: "message"; text: string };

const RULES: Array<{ re: RegExp; result: CopilotResult }> = [
  { re: /make (it |this )?easier/i, result: { kind: "action", action: "easier" } },
  { re: /make (it |this )?harder/i, result: { kind: "action", action: "harder" } },
  { re: /add (more |five |5 |extra )?questions/i, result: { kind: "action", action: "more_questions" } },
  { re: /reduce|fewer|less questions/i, result: { kind: "action", action: "fewer_questions" } },
  { re: /black\s*(and|&)?\s*white|b\s*&\s*w|outline/i, result: { kind: "action", action: "to_bw" } },
  { re: /colour|color/i, result: { kind: "action", action: "to_color" } },
  { re: /answer key/i, result: { kind: "action", action: "answer_key" } },
  { re: /translate.*hindi|hindi/i, result: { kind: "action", action: "translate_hindi" } },
  { re: /translate.*english|english/i, result: { kind: "action", action: "translate_english" } },
  { re: /replace.*image|regenerate.*image/i, result: { kind: "action", action: "replace_images" } },
  { re: /increase spacing|more space/i, result: { kind: "action", action: "increase_spacing" } },
  { re: /reduce page|fewer page/i, result: { kind: "regenerate", request: { pageCount: 1 } } },
  { re: /ukg/i, result: { kind: "regenerate", request: { classLevel: "ukg" } } },
  { re: /lkg/i, result: { kind: "regenerate", request: { classLevel: "lkg" } } },
  { re: /nursery/i, result: { kind: "regenerate", request: { classLevel: "nursery" } } },
  { re: /grade\s*1/i, result: { kind: "regenerate", request: { classLevel: "grade1" } } },
  { re: /grade\s*2/i, result: { kind: "regenerate", request: { classLevel: "grade2" } } },
  { re: /printable/i, result: { kind: "message", text: "Your worksheet is already A4 print-ready. Use Export → PDF." } },
  { re: /writing practice|more writing|handwriting/i, result: { kind: "action", action: "more_writing" } },
  { re: /easier words|simpler words|simple vocabulary/i, result: { kind: "action", action: "easier_words" } },
  { re: /reduce colou?ring|less colou?ring/i, result: { kind: "action", action: "reduce_colour" } },
  { re: /handwriting practice/i, result: { kind: "action", action: "handwriting_practice" } },
  { re: /homework/i, result: { kind: "action", action: "homework_mode" } },
  { re: /assessment|test/i, result: { kind: "action", action: "assessment_mode" } },
  { re: /low ink|eco print|reduce ink/i, result: { kind: "action", action: "low_ink" } },
  { re: /outline images?|black outline/i, result: { kind: "action", action: "to_bw" } },
  { re: /revision/i, result: { kind: "action", action: "revision_questions" } },
  { re: /bloom/i, result: { kind: "action", action: "blooms_taxonomy" } },
];

export function parseCopilotCommand(message: string, doc: WorksheetDocument): CopilotResult {
  const trimmed = message.trim();
  for (const { re, result } of RULES) {
    if (re.test(trimmed)) return result;
  }

  const seaMatch = trimmed.match(/use\s+(.+?)\s+instead/i);
  if (seaMatch?.[1]) {
    return { kind: "regenerate", request: { prompt: `Worksheet on ${seaMatch[1]}` } };
  }

  const replaceMatch = trimmed.match(/replace\s+(\w+)\s+with\s+(\w+)/i);
  if (replaceMatch) {
    const newPrompt = doc.prompt.replace(new RegExp(replaceMatch[1]!, "gi"), replaceMatch[2]!);
    return { kind: "regenerate", request: { prompt: newPrompt } };
  }

  if (trimmed.length > 3) {
    return { kind: "regenerate", request: { prompt: trimmed } };
  }

  return { kind: "message", text: "Try: Make easier, Add questions, Use sea animals, Translate Hindi" };
}

export function buildCopilotAiSystemPrompt(): string {
  return `You are the LPS Worksheet Copilot. Parse teacher requests into JSON:
{ "action": "easier"|"harder"|"more_questions"|"fewer_questions"|"to_bw"|"to_color"|"answer_key"|"translate_hindi"|"translate_english"|"replace_images"|"increase_spacing"|"more_writing"|"easier_words"|"reduce_colour"|"handwriting_practice"|"homework_mode"|"assessment_mode"|"low_ink"|"revision_questions"|"blooms_taxonomy" }
OR { "regenerate": { "prompt"?: string, "classLevel"?: string, "pageCount"?: number } }
OR { "message": string }
Output ONLY valid JSON.`;
}

export function buildCopilotAiUserPrompt(message: string, doc: WorksheetDocument): string {
  return JSON.stringify({
    message,
    currentTopic: doc.meta.topic,
    classLevel: doc.meta.classLevel,
    subject: doc.meta.subject,
    pageCount: doc.meta.pageCount,
  });
}

export function parseCopilotAiResponse(raw: unknown, fallback: CopilotResult): CopilotResult {
  if (!raw || typeof raw !== "object") return fallback;
  const j = raw as Record<string, unknown>;
  if (typeof j.action === "string") return { kind: "action", action: j.action as WorksheetImproveAction };
  if (j.regenerate && typeof j.regenerate === "object") return { kind: "regenerate", request: j.regenerate as Partial<WorksheetGenerateRequest> };
  if (typeof j.message === "string") return { kind: "message", text: j.message };
  return fallback;
}
