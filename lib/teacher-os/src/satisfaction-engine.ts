import type { SatisfactionRecord } from "./pilot-types.js";
import { trackProductEvent } from "./product-analytics.js";

const KEY = "teacher-os-satisfaction-v81";
const PROMPT_COOLDOWN_MS = 7 * 86400000;

function load(): SatisfactionRecord[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SatisfactionRecord[]) : [];
  } catch {
    return [];
  }
}

function save(records: SatisfactionRecord[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(records.slice(-30)));
    }
  } catch { /* */ }
}

const LAST_PROMPT_KEY = "teacher-os-satisfaction-last-v81";

export function shouldShowSatisfactionPrompt(context: string): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const last = localStorage.getItem(LAST_PROMPT_KEY);
    if (last && Date.now() - parseInt(last, 10) < PROMPT_COOLDOWN_MS) return false;
    const recent = load().some((r) => r.context === context && Date.now() - new Date(r.at).getTime() < PROMPT_COOLDOWN_MS);
    return !recent;
  } catch {
    return false;
  }
}

export function markSatisfactionPromptShown(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));
    }
  } catch { /* */ }
}

export function recordSatisfaction(
  stars: 1 | 2 | 3 | 4 | 5,
  context: string,
  comment?: string,
): SatisfactionRecord {
  const record: SatisfactionRecord = {
    stars,
    comment: comment?.trim() || undefined,
    context,
    at: new Date().toISOString(),
  };
  const records = [...load(), record];
  save(records);
  trackProductEvent("satisfaction_rating", { stars, context, hasComment: Boolean(comment) });
  return record;
}

export function getSatisfactionRecords(): SatisfactionRecord[] {
  return load();
}
