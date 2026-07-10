import type { CurriculumFramework, KnowledgeBaseEntry } from "./types.js";

export const KNOWLEDGE_BASE: KnowledgeBaseEntry[] = [
  { id: "cbse", label: "CBSE", description: "Central Board of Secondary Education — structured term-wise progression.", ageRange: "Nursery – Grade 2" },
  { id: "icse", label: "ICSE", description: "Indian Certificate of Secondary Education — language-rich curriculum.", ageRange: "Nursery – Grade 2" },
  { id: "state_board", label: "State Boards", description: "State-specific syllabus alignment for UP and regional boards.", ageRange: "Nursery – Grade 2" },
  { id: "nep_2020", label: "NEP 2020", description: "National Education Policy — play-based, competency-focused learning.", ageRange: "Foundational stage" },
  { id: "montessori", label: "Montessori", description: "Self-directed activity, hands-on learning, collaborative play.", ageRange: "2 – 6 years" },
  { id: "playway", label: "Playway", description: "Learning through play, songs, and movement.", ageRange: "Pre-primary" },
  { id: "phonics", label: "Phonics", description: "Letter sounds, blending, and early reading progression.", ageRange: "LKG – Grade 1" },
  { id: "custom_lps", label: "LPS Curriculum", description: "Lucknow Public School custom pre-primary curriculum.", ageRange: "Nursery – Grade 2" },
];

export function getKnowledgeBaseEntry(id: CurriculumFramework): KnowledgeBaseEntry | undefined {
  return KNOWLEDGE_BASE.find((e) => e.id === id);
}
