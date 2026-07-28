import type { GeneratedScriptPayload } from "../types/content-package.js";
import { ContentEngineError } from "../ai/errors.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(obj: Record<string, unknown>, key: string, path: string): string {
  const value = obj[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ContentEngineError(
      "SCHEMA_VALIDATION",
      `Missing or invalid string at ${path}.${key}`,
      { recoverable: true },
    );
  }
  return value.trim();
}

function requireStringArray(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  min: number,
  max?: number,
): string[] {
  const value = obj[key];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new ContentEngineError(
      "SCHEMA_VALIDATION",
      `Expected string array at ${path}.${key}`,
      { recoverable: true },
    );
  }
  const cleaned = value.map((v) => v.trim()).filter(Boolean);
  if (cleaned.length < min || (max !== undefined && cleaned.length > max)) {
    throw new ContentEngineError(
      "SCHEMA_VALIDATION",
      `Expected ${min}${max ? `-${max}` : "+"} items at ${path}.${key}, got ${cleaned.length}`,
      { recoverable: true },
    );
  }
  return cleaned;
}

/** Parse and validate AI JSON into GeneratedScriptPayload. */
export function parseGeneratedScriptPayload(text: string): GeneratedScriptPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFences(text));
  } catch (error) {
    throw new ContentEngineError("INVALID_JSON", "AI response is not valid JSON", {
      recoverable: true,
      cause: error,
    });
  }

  if (!isObject(raw)) {
    throw new ContentEngineError("SCHEMA_VALIDATION", "AI JSON root must be an object", {
      recoverable: true,
    });
  }

  const titlesRaw = raw.titles;
  if (!isObject(titlesRaw)) {
    throw new ContentEngineError("SCHEMA_VALIDATION", "titles must be an object", {
      recoverable: true,
    });
  }

  const descriptionRaw = raw.description;
  if (!isObject(descriptionRaw)) {
    throw new ContentEngineError("SCHEMA_VALIDATION", "description must be an object", {
      recoverable: true,
    });
  }

  const alternates = requireStringArray(titlesRaw, "alternates", "titles", 5, 5);

  return {
    hook: requireString(raw, "hook", "root"),
    openingQuestion: requireString(raw, "openingQuestion", "root"),
    story: requireString(raw, "story", "root"),
    keyPoints: requireStringArray(raw, "keyPoints", "root", 3, 5),
    cta: requireString(raw, "cta", "root"),
    voiceScript: requireString(raw, "voiceScript", "root"),
    sceneScript: requireString(raw, "sceneScript", "root"),
    titles: {
      primary: requireString(titlesRaw, "primary", "titles"),
      alternates,
      short: requireString(titlesRaw, "short", "titles"),
      highCtr: requireString(titlesRaw, "highCtr", "titles"),
      searchOptimized: requireString(titlesRaw, "searchOptimized", "titles"),
    },
    description: {
      seo: requireString(descriptionRaw, "seo", "description"),
      appPromotion: requireString(descriptionRaw, "appPromotion", "description"),
      playStoreCta: requireString(descriptionRaw, "playStoreCta", "description"),
      website: requireString(descriptionRaw, "website", "description"),
      socialLinks: requireString(descriptionRaw, "socialLinks", "description"),
      disclaimer: requireString(descriptionRaw, "disclaimer", "description"),
    },
    hashtags: requireStringArray(raw, "hashtags", "root", 10, 20),
    keywords: requireStringArray(raw, "keywords", "root", 3, 30),
  };
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return fenced?.[1]?.trim() ?? trimmed;
}
