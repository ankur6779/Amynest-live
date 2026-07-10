import type { LessonChatIntent } from "./types.js";
import type { WorksheetClass } from "@workspace/worksheet-studio";
import { parseNaturalLessonRequest } from "./curriculum-memory.js";

export function parseLessonChatIntent(message: string): LessonChatIntent {
  const l = message.toLowerCase().trim();
  const parsed = parseNaturalLessonRequest(message);

  if (/create.*lesson|tomorrow|teach\s+/i.test(message)) {
    return { action: "create_lesson", topic: parsed.topic, classLevel: parsed.classLevel, rawMessage: message };
  }
  if (/reduce difficulty|make easier|easier/i.test(l)) return { action: "reduce_difficulty", rawMessage: message };
  if (/handwriting|writing practice/i.test(l)) return { action: "increase_writing", rawMessage: message };
  if (/montessori/i.test(l)) return { action: "montessori", rawMessage: message };
  if (/activity.?based/i.test(l)) return { action: "activity_based", rawMessage: message };
  if (/bloom/i.test(l)) return { action: "blooms_taxonomy", rawMessage: message };
  if (/assessment.*easier|easier assessment/i.test(l)) return { action: "easier_assessment", rawMessage: message };
  if (/worksheet|generate/i.test(l)) return { action: "generate_worksheet", topic: parsed.topic, rawMessage: message };
  if (/what should i teach/i.test(l)) return { action: "create_lesson", rawMessage: message };

  return { action: "unknown", rawMessage: message };
}

export function lessonChatResponse(intent: LessonChatIntent): string {
  switch (intent.action) {
    case "create_lesson":
      return intent.topic
        ? `I'll prepare a complete teaching pack for "${intent.topic}"${intent.classLevel ? ` (${intent.classLevel})` : ""} — lesson plan, worksheets, homework, and parent message.`
        : "Tell me the topic and class — e.g. \"I have to teach Sea Animals tomorrow to UKG.\"";
    case "reduce_difficulty":
      return "I'll simplify vocabulary, add more pictures, and reduce writing lines on the worksheet.";
    case "increase_writing":
      return "Adding handwriting practice lines and trace activities to the worksheet.";
    case "montessori":
      return "Switching to Montessori style — hands-on activities, self-paced tasks, minimal teacher talk.";
    case "activity_based":
      return "Emphasizing circle time, matching, and cut-paste activities over seat work.";
    case "blooms_taxonomy":
      return "Balancing remember → understand → apply questions across the lesson.";
    case "easier_assessment":
      return "Creating a gentler assessment with picture choices and oral questions.";
    case "generate_worksheet":
      return intent.topic
        ? `Generating a new worksheet on "${intent.topic}".`
        : "Opening Worksheet Studio to generate a new sheet.";
    default:
      return "I can help you plan lessons, create teaching packs, or adjust worksheets. Try: \"Create tomorrow's lesson on Sea Animals for UKG.\"";
  }
}

export function detectClassFromMessage(message: string): WorksheetClass | undefined {
  return parseNaturalLessonRequest(message).classLevel;
}
