import type {
  QuestionType,
  WorksheetClass,
  WorksheetDifficulty,
  WorksheetDocument,
  WorksheetGenerateRequest,
  WorksheetMeta,
  WorksheetPage,
  WorksheetQuestionBlock,
  WorksheetSubject,
} from "./types.js";
import { dedupePrompts, shuffleInPlace } from "./pagination.js";
import { layoutQuestionBlocks } from "./layout-engine.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";
import { diversifyQuestionTemplates } from "./question-diversity-engine.js";
import { getLpsStandard } from "./lps-standards.js";
import { finalizeWorksheet } from "./worksheet-pipeline.js";
import {
  assembleDocument,
  buildLpsHeaderElements,
  buildQuestionElement,
  continuationContentStartY,
  createEmptyPage,
  estimateQuestionBlockHeight,
  nextId,
  page1ContentStartY,
  resetIdCounter,
} from "./renderer/page-layout.js";

interface QuestionTemplate {
  type: QuestionType;
  prompt: string;
  options?: string[];
  emoji?: string;
  label?: string;
  answerLine?: boolean;
}

const TOPIC_BANK: Record<string, QuestionTemplate[]> = {
  "sea animals": [
    {
      type: "reading",
      prompt: "Read the sentences and colour the correct sea animal.\na. I see a fish.\nb. I see a shark.\nc. I see a whale.\nd. I see a crab.",
      options: ["Fish", "Shark", "Whale", "Crab"],
      label: "fish",
    },
    {
      type: "circle",
      prompt: "Circle the water animals.",
      options: ["Fish", "Dog", "Shark", "Cat", "Whale", "Bird"],
      label: "shark",
    },
    {
      type: "beginning_sounds",
      prompt: "Look at the picture and colour the letter that matches its beginning sound.",
      options: ["f", "s", "w", "c", "t", "o", "w", "f", "a", "o", "e", "s"],
      label: "whale",
    },
    {
      type: "match",
      prompt: "Match the animal to its name.",
      options: ["Octopus", "Fish", "Turtle", "Crab"],
      label: "octopus",
    },
  ],
  default: [
    { type: "circle", prompt: "Circle the correct answer.", options: ["A", "B", "C", "D"] },
    { type: "fill_blank", prompt: "Fill in the blank: The sky is ____.", answerLine: true },
    { type: "match", prompt: "Draw a line to match.", options: ["🍎 Apple", "🍌 Banana"] },
    { type: "tick", prompt: "Tick (✓) the bigger one.", options: ["Big", "Small"] },
    { type: "count", prompt: "Count the objects and write the number.", emoji: "🔵", answerLine: true },
    { type: "pattern", prompt: "Complete the pattern: A B A B ___", answerLine: true },
  ],
  math: [
    { type: "math", prompt: "2 + 3 = ___", answerLine: true },
    { type: "math", prompt: "5 − 2 = ___", answerLine: true },
    { type: "count", prompt: "Count and write.", emoji: "🍎🍎🍎", answerLine: true },
    { type: "circle", prompt: "Circle the number that is greater.", options: ["7", "3"] },
    { type: "pattern", prompt: "2, 4, 6, ___", answerLine: true },
  ],
  hindi: [
    { type: "hindi", prompt: "स्वर लिखें: अ", answerLine: true },
    { type: "trace", prompt: "Trace: क ख ग", answerLine: true },
    { type: "match", prompt: "Match the picture to the word.", options: ["कमल", "किताब"] },
    { type: "fill_blank", prompt: "___ से कबूतर (fill the missing letter)", answerLine: true },
  ],
  phonics: [
    { type: "beginning_sounds", prompt: "Circle the picture that starts with /b/.", options: ["🐝", "🐱", "🐶"] },
    { type: "phonics", prompt: "Write a word that rhymes with cat.", answerLine: true },
    { type: "missing_letters", prompt: "C _ T (fill the missing letter)", answerLine: true },
  ],
};

function formatTopicLabel(key: string): string {
  const labels: Record<string, string> = {
    "sea animals": "Sea Animals",
    fruits: "Fruits",
    colours: "Colours",
    tracing: "Tracing",
    default: "Practice",
    math: "Math",
    hindi: "Hindi",
    phonics: "Phonics",
  };
  if (labels[key]) return labels[key]!;
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}

function detectTopic(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("sea") && lower.includes("animal")) return "sea animals";
  if (lower.includes("sea animal")) return "sea animals";
  if (lower.includes("hindi") || lower.includes("swar")) return "hindi";
  if (lower.includes("phonics") || lower.includes("sound") || lower.includes("rhym")) return "phonics";
  if (lower.includes("addition") || lower.includes("math") || lower.includes("subtract")) return "math";
  if (lower.includes("fruit")) return "fruits";
  if (lower.includes("colour") || lower.includes("color")) return "colours";
  if (lower.includes("trace")) return "tracing";
  return "default";
}

function templatesForRequest(req: WorksheetGenerateRequest): QuestionTemplate[] {
  const topic = detectTopic(req.prompt);
  let pool = TOPIC_BANK[topic] ?? TOPIC_BANK.default;
  if (req.subject === "math") pool = [...TOPIC_BANK.math, ...pool];
  if (req.subject === "hindi") pool = [...TOPIC_BANK.hindi, ...pool];
  if (req.subject === "phonics") pool = [...TOPIC_BANK.phonics, ...pool];

  const standard = getLpsStandard(req.classLevel);
  let perPage = standard.questionsPerPage[req.difficulty];
  let pageCount = req.pageCount;

  /** LPS Sea Animals reference layout: 2 questions per page across 2 pages */
  if (topic === "sea animals" && pool === TOPIC_BANK["sea animals"]) {
    perPage = 2;
    pageCount = Math.max(req.pageCount, 2);
  }

  const total = perPage * pageCount;
  const shuffled = shuffleInPlace([...pool]);
  const raw: QuestionTemplate[] = [];
  for (let i = 0; i < shuffled.length * 2 && raw.length < total * 2; i++) {
    raw.push(shuffled[i % shuffled.length]!);
  }

  /** LPS reference worksheets — preserve exact activity sequence */
  if (topic === "sea animals" && pool === TOPIC_BANK["sea animals"]) {
    return pool.slice(0, Math.min(total, pool.length));
  }

  return diversifyQuestionTemplates(dedupePrompts(raw), total, req.classLevel, req.difficulty);
}

function scaleDifficulty(
  template: QuestionTemplate,
  difficulty: WorksheetDifficulty,
  classLevel: WorksheetClass,
): QuestionTemplate {
  if (difficulty === "easy" && classLevel === "nursery") {
    return { ...template, prompt: template.prompt.replace(/Write|Complete/, "Circle or colour") };
  }
  if (difficulty === "hard") {
    return { ...template, prompt: `${template.prompt} (Challenge!)` };
  }
  return template;
}

function layoutQuestionsOnPages(
  questions: QuestionTemplate[],
  meta: WorksheetMeta,
): WorksheetPage[] {
  const blocks = questions.map((tmpl) => {
    const scaled = scaleDifficulty(tmpl, meta.difficulty, meta.classLevel);
    const opts = tmpl.options;
    globalQNum += 1;
    const label = scaled.label ?? scaled.prompt;
    const detected = detectIllustrationFromText(label);
    const visualTypes = new Set<QuestionTemplate["type"]>(["colour", "circle", "trace", "draw", "picture_recognition", "count"]);
    const hasKeyword = detected !== "star";
    const illustrationSrc = scaled.emoji || scaled.label || visualTypes.has(scaled.type) || hasKeyword
      ? getIllustration(detected)
      : undefined;
    const height = estimateQuestionBlockHeight(
      meta.classLevel,
      opts?.length ?? 0,
      Boolean(illustrationSrc),
    );
    return {
      block: {
        questionNumber: globalQNum,
        questionType: scaled.type,
        prompt: `${globalQNum}  ${scaled.prompt}`,
        options: opts,
        answerLine: scaled.answerLine,
        illustrationEmoji: scaled.emoji,
        illustrationLabel: scaled.label,
        illustrationSrc,
        width: 555,
        height,
      },
      height,
      hasIllustration: Boolean(illustrationSrc),
      keepTogether: Boolean(illustrationSrc),
    };
  });

  const paginated = layoutQuestionBlocks(
    blocks,
    meta,
    page1ContentStartY(meta.classLevel),
    continuationContentStartY(meta.classLevel),
    meta.pageCount,
  );

  return paginated.map((pageBlocks, idx) => {
    const page = createEmptyPage(idx + 1, idx === 0);
    if (idx === 0) page.elements.push(...buildLpsHeaderElements(meta));
    for (const b of pageBlocks) {
      page.elements.push(buildQuestionElement(b));
    }
    return page;
  });
}

let globalQNum = 0;

export function generateWorksheetLocalCore(req: WorksheetGenerateRequest): WorksheetDocument {
  resetIdCounter();
  globalQNum = 0;

  const topicKey = detectTopic(req.prompt);
  const effectivePageCount = topicKey === "sea animals" ? Math.max(req.pageCount, 2) : req.pageCount;
  const meta: WorksheetMeta = {
    title: req.prompt.trim() || "Practice Worksheet",
    topic: formatTopicLabel(topicKey),
    classLevel: req.classLevel,
    subject: req.subject,
    difficulty: req.difficulty,
    pageCount: effectivePageCount,
    colorMode: "color",
    isAnswerKey: req.answerKey ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const templates = templatesForRequest(req);
  const pages = layoutQuestionsOnPages(templates, meta);
  meta.pageCount = pages.length;

  return assembleDocument(meta, pages, req.prompt);
}

export function generateWorksheetLocal(req: WorksheetGenerateRequest): WorksheetDocument {
  return finalizeWorksheet(generateWorksheetLocalCore(req), req).document;
}

export function extractTopicFromPrompt(prompt: string): string {
  const cleaned = prompt
    .replace(/create|make|worksheet|a|an|the|on|for/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Practice";
}
