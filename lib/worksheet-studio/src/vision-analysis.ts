import { CLASS_LABELS, SUBJECT_LABELS } from "./constants.js";
import type {
  ReferenceAnalysis,
  WorksheetClass,
  WorksheetDifficulty,
  WorksheetLanguage,
  WorksheetReferenceContext,
  WorksheetSubject,
} from "./types.js";

const CACHE_KEY = "worksheet-vision-cache-v1";

interface VisionCache {
  [referenceId: string]: ReferenceAnalysis;
}

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function loadCache(): VisionCache {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as VisionCache) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: VisionCache): void {
  if (!canUseStorage()) return;
  try {
    const keys = Object.keys(cache);
    const trimmed = keys.length > 30 ? Object.fromEntries(keys.slice(-30).map((k) => [k, cache[k]!])) : cache;
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch { /* */ }
}

function detectClass(text: string): WorksheetClass | undefined {
  const l = text.toLowerCase();
  if (l.includes("nursery")) return "nursery";
  if (l.includes("lkg")) return "lkg";
  if (l.includes("ukg")) return "ukg";
  if (l.includes("grade 2") || l.includes("grade2")) return "grade2";
  if (l.includes("grade 1") || l.includes("grade1")) return "grade1";
  return undefined;
}

function detectSubject(text: string): WorksheetSubject | undefined {
  const l = text.toLowerCase();
  if (l.includes("math") || l.includes("addition") || l.includes("subtract")) return "math";
  if (l.includes("hindi") || l.includes("swar")) return "hindi";
  if (l.includes("evs") || l.includes("animal") || l.includes("plant")) return "evs";
  if (l.includes("phonics") || l.includes("sound")) return "phonics";
  if (l.includes("english") || l.includes("reading")) return "english";
  return undefined;
}

function detectTopic(ref: WorksheetReferenceContext, text: string): string | undefined {
  const topicMatch = text.match(/topic\s*[–-]\s*([^\n]+)/i);
  if (topicMatch?.[1]) return topicMatch[1].trim();
  const name = ref.filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  if (name.length > 3) return name.replace(/lps|worksheet|topic/gi, "").trim() || undefined;
  return undefined;
}

/** Local heuristic analysis from reference metadata + thumbnails */
export function analyzeReferenceLocal(ref: WorksheetReferenceContext): ReferenceAnalysis {
  const text = `${ref.textSnippet ?? ""} ${ref.filename} ${ref.layoutHints?.join(" ") ?? ""}`.toLowerCase();
  const classLevel = detectClass(text);
  const subject = detectSubject(text);
  const topic = detectTopic(ref, text);

  const questionTypes: string[] = [];
  if (/colour|color/i.test(text)) questionTypes.push("colouring");
  if (/match/i.test(text)) questionTypes.push("matching");
  if (/trace|writing|handwriting/i.test(text)) questionTypes.push("writing");
  if (/circle|tick/i.test(text)) questionTypes.push("selection");
  if (/read|sentence/i.test(text)) questionTypes.push("reading");
  if (/count|math|add/i.test(text)) questionTypes.push("math");
  if (questionTypes.length === 0) questionTypes.push("mixed activities");

  const layoutFeatures: string[] = [];
  if (ref.kind === "pdf" || ref.pageCount) layoutFeatures.push("multi-page layout");
  if (/border|frame/i.test(text) || ref.layoutHints?.some((h) => h.includes("border"))) {
    layoutFeatures.push("bordered pages");
  }
  if (/header|logo|lps|school/i.test(text)) layoutFeatures.push("school header");
  if ((ref.imageCount ?? 0) > 2) layoutFeatures.push("illustration-heavy");
  if (/table|grid/i.test(text)) layoutFeatures.push("tables/grids");
  layoutFeatures.push("generous white space");

  const illustrationDensity: ReferenceAnalysis["illustrationDensity"] =
    (ref.imageCount ?? 0) >= 6 ? "high" : (ref.imageCount ?? 0) >= 2 ? "medium" : "low";

  return {
    referenceId: ref.id,
    classLevel,
    subject,
    topic,
    difficulty: /hard|challenge/i.test(text) ? "hard" : /medium/i.test(text) ? "medium" : "easy",
    worksheetStyle: ref.kind === "pdf" ? "printable school worksheet" : "visual reference",
    questionTypes,
    hasWritingPractice: /writing|trace|handwriting|blank/i.test(text),
    illustrationDensity,
    estimatedAge: classLevel ? CLASS_LABELS[classLevel] : "Pre-primary",
    pageCount: ref.pageCount,
    language: /hindi|bilingual|swar/i.test(text) ? "hindi" : /bilingual/i.test(text) ? "bilingual" : "english",
    curriculum: /lps|lucknow public/i.test(text) ? "LPS" : undefined,
    brandingDetected: /lps|lucknow public|school logo/i.test(text) ? "LPS-style branding" : undefined,
    layoutFeatures,
    confidence: ref.thumbnailDataUrl ? 72 : 58,
    source: "local",
  };
}

export function getCachedReferenceAnalysis(refId: string): ReferenceAnalysis | null {
  if (!canUseStorage()) return null;
  return loadCache()[refId] ?? null;
}

export function cacheReferenceAnalysis(analysis: ReferenceAnalysis): void {
  if (!canUseStorage()) return;
  const cache = loadCache();
  cache[analysis.referenceId] = analysis;
  saveCache(cache);
}

export function analyzeReferences(
  refs: WorksheetReferenceContext[],
  useCache = true,
): ReferenceAnalysis[] {
  return refs.map((ref) => {
    if (useCache) {
      const cached = getCachedReferenceAnalysis(ref.id);
      if (cached) return cached;
    }
    const analysis = analyzeReferenceLocal(ref);
    cacheReferenceAnalysis(analysis);
    return analysis;
  });
}

export function mergeReferenceAnalyses(analyses: ReferenceAnalysis[]): Partial<ReferenceAnalysis> {
  if (!analyses.length) return {};
  const first = analyses[0]!;
  return {
    classLevel: analyses.find((a) => a.classLevel)?.classLevel ?? first.classLevel,
    subject: analyses.find((a) => a.subject)?.subject ?? first.subject,
    topic: analyses.find((a) => a.topic)?.topic ?? first.topic,
    difficulty: analyses.find((a) => a.difficulty)?.difficulty ?? first.difficulty,
    pageCount: analyses.reduce((max, a) => Math.max(max, a.pageCount ?? 0), 0) || first.pageCount,
    language: analyses.find((a) => a.language && a.language !== "english")?.language ?? first.language,
    worksheetStyle: first.worksheetStyle,
    questionTypes: [...new Set(analyses.flatMap((a) => a.questionTypes))],
    layoutFeatures: [...new Set(analyses.flatMap((a) => a.layoutFeatures))],
    illustrationDensity: analyses.some((a) => a.illustrationDensity === "high")
      ? "high"
      : analyses.some((a) => a.illustrationDensity === "medium") ? "medium" : "low",
    brandingDetected: analyses.find((a) => a.brandingDetected)?.brandingDetected,
    confidence: Math.round(analyses.reduce((s, a) => s + a.confidence, 0) / analyses.length),
  };
}

export function buildVisionAnalysisSystemPrompt(): string {
  return `You analyze teacher-uploaded worksheet references for LPS Worksheet Studio.
Output ONLY JSON matching ReferenceAnalysis fields. Treat uploads as visual INSPIRATION only — never instruct copying copyrighted content.
Infer: class, subject, topic, difficulty, layout, question types, writing practice, illustration density, age, pages, language, curriculum, branding.
Return: { "analyses": ReferenceAnalysis[] }`;
}

export function buildVisionAnalysisUserPayload(refs: WorksheetReferenceContext[]): string {
  return JSON.stringify({
    references: refs.map((r) => ({
      id: r.id,
      filename: r.filename,
      kind: r.kind,
      pages: r.pageCount,
      images: r.imageCount,
      hints: r.layoutHints,
      snippet: r.textSnippet?.slice(0, 300),
      hasThumbnail: Boolean(r.thumbnailDataUrl),
    })),
    instruction: "Generate original worksheets inspired by layout/style only.",
  });
}

export function formatAnalysisLabel(a: Partial<ReferenceAnalysis>): string {
  const parts: string[] = [];
  if (a.classLevel) parts.push(CLASS_LABELS[a.classLevel]);
  if (a.subject) parts.push(SUBJECT_LABELS[a.subject]);
  if (a.topic) parts.push(a.topic);
  return parts.join(" · ") || "Worksheet reference";
}
