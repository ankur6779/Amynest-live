export const IS_PREMIUM = false;
export const AI_DAILY_QUESTION_LIMIT = 5;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    (((d.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}_w${weekNum}`;
}

const QUESTION_COUNT_KEY = () => `amynest_ai_q_${todayKey()}`;
const INSIGHTS_CACHE_KEY = () => `amynest_insights_${weekKey()}`;

export function getQuestionsUsed(): number {
  try {
    return parseInt(localStorage.getItem(QUESTION_COUNT_KEY()) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function getRemainingQuestions(): number {
  return Math.max(0, AI_DAILY_QUESTION_LIMIT - getQuestionsUsed());
}

export function isQuestionLimitReached(): boolean {
  return getQuestionsUsed() >= AI_DAILY_QUESTION_LIMIT;
}

export function recordQuestion(): void {
  try {
    localStorage.setItem(QUESTION_COUNT_KEY(), String(getQuestionsUsed() + 1));
  } catch (e) { console.error("REAL ERROR:", e); }
}

export interface CachedInsights {
  data: {
    summary: string;
    insights: Array<{ type: string; message: string; icon: string }>;
  };
  generatedAt: string;
}

export function getCachedInsights(): CachedInsights | null {
  try {
    const raw = localStorage.getItem(INSIGHTS_CACHE_KEY());
    return raw ? (JSON.parse(raw) as CachedInsights) : null;
  } catch {
    return null;
  }
}

export function saveCachedInsights(data: CachedInsights["data"]): void {
  try {
    const payload: CachedInsights = { data, generatedAt: new Date().toISOString() };
    localStorage.setItem(INSIGHTS_CACHE_KEY(), JSON.stringify(payload));
  } catch (e) { console.error("REAL ERROR:", e); }
}

export function clearInsightsCache(): void {
  try {
    localStorage.removeItem(INSIGHTS_CACHE_KEY());
  } catch (e) { console.error("REAL ERROR:", e); }
}
