import {
  extractLearningZoneStrings,
  isNonEnglishLearningZoneText,
} from "@workspace/learning-zone-english";

const FORBIDDEN = /\b(lorem ipsum|TODO|TBD|placeholder|xxx|fixme)\b/i;

export type ValidationIssue = {
  kind: "duplicate_id" | "duplicate_title" | "empty_field" | "forbidden" | "non_english";
  id?: string;
  detail: string;
};

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) {
    return value.length === 0 || value.some((v) => isEmpty(v));
  }
  return false;
}

function collectStringFields(
  item: Record<string, unknown>,
  keys: string[],
): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const v = item[key];
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) {
      for (const el of v) {
        if (typeof el === "string") out.push(el);
      }
    }
  }
  return out;
}

export function validateContentBank<T extends { id: string; title?: string }>(
  category: string,
  items: T[],
  requiredKeys: string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const id = String(item.id ?? "");

    if (!id || seenIds.has(id)) {
      issues.push({
        kind: "duplicate_id",
        id,
        detail: `${category}: duplicate or missing id "${id}"`,
      });
    } else {
      seenIds.add(id);
    }

    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (title) {
      const titleKey = `${category}:${title.toLowerCase()}`;
      if (seenTitles.has(titleKey)) {
        issues.push({
          kind: "duplicate_title",
          id,
          detail: `${category}: duplicate title "${title}"`,
        });
      } else {
        seenTitles.add(titleKey);
      }
    }

    for (const key of requiredKeys) {
      if (isEmpty(item[key])) {
        issues.push({
          kind: "empty_field",
          id,
          detail: `${category}: empty "${key}" on ${id}`,
        });
      }
    }

    const strings = collectStringFields(item, [
      ...requiredKeys,
      "description",
      "lessonContent",
      "story",
      "scenario",
      "speech",
      "funFact",
      "amyExplanation",
      "amyTip",
      "audioText",
      "correctAnswer",
      "eventTheme",
    ]);
    for (const s of strings) {
      if (FORBIDDEN.test(s)) {
        issues.push({
          kind: "forbidden",
          id,
          detail: `${category}: forbidden token in ${id}`,
        });
      }
      if (isNonEnglishLearningZoneText(s)) {
        issues.push({
          kind: "non_english",
          id,
          detail: `${category}: non-English text on ${id}`,
        });
      }
    }

    const allStrings = extractLearningZoneStrings(item);
    for (const s of allStrings) {
      if (FORBIDDEN.test(s)) {
        issues.push({ kind: "forbidden", id, detail: `${category}: forbidden in ${id}` });
        break;
      }
      if (isNonEnglishLearningZoneText(s)) {
        issues.push({ kind: "non_english", id, detail: `${category}: non-English in ${id}` });
        break;
      }
    }
  }

  return issues;
}
