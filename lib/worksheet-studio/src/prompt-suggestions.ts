export interface PromptSuggestion {
  id: string;
  label: string;
  insert: string;
}

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  { id: "colouring", label: "+ Add colouring", insert: "Include colouring activities with black outline printable images." },
  { id: "tracing", label: "+ Add tracing", insert: "Include letter/number tracing with dotted guides." },
  { id: "handwriting", label: "+ Add handwriting", insert: "Include handwriting practice with wide writing lines." },
  { id: "matching", label: "+ Add matching", insert: "Include matching activities (picture to word)." },
  { id: "counting", label: "+ Add counting", insert: "Include counting activities with objects to count." },
  { id: "answer_key", label: "+ Add answer key", insert: "Design questions suitable for a separate answer key." },
  { id: "homework", label: "+ Homework version", insert: "Style as a homework worksheet with clear parent instructions." },
  { id: "assessment", label: "+ Assessment version", insert: "Style as a short classroom assessment with varied question types." },
  { id: "hindi", label: "+ Hindi", insert: "Include Hindi vocabulary and Devanagari practice." },
  { id: "english", label: "+ English", insert: "Focus on English reading and vocabulary." },
  { id: "bilingual", label: "+ Bilingual", insert: "Bilingual English-Hindi labels and instructions." },
  { id: "low_ink", label: "+ Low ink", insert: "Low-ink printable design with minimal colour fill." },
];

export function insertSuggestionIntoPrompt(prompt: string, insert: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return insert;
  if (trimmed.toLowerCase().includes(insert.slice(0, 24).toLowerCase())) return trimmed;
  return `${trimmed}\n\n${insert}`;
}
