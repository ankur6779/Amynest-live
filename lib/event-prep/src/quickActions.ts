import type { EventPrepCountry, SchoolEvent } from "./eventTypes";
import { EVENT_CHARACTERS } from "./content/characters";
import type { EventCategoryId } from "./types";

export type QuickActionType = "speech" | "costume" | "checklist";

export interface QuickActionResult {
  type: QuickActionType;
  title: string;
  intro: string;
  items: string[];
  source: "local" | "ai";
}

export interface QuickActionInput {
  type: QuickActionType;
  event: SchoolEvent;
  childAge: number;
  childName?: string;
  country?: EventPrepCountry;
  customTheme?: string;
}

function ageSpeechLine(event: SchoolEvent, age: number, name?: string): string {
  const base = event.speechIdeas[0] ?? `I am ready for ${event.name}!`;
  if (age <= 5) {
    return base.split(".")[0]?.trim() + "." || base;
  }
  if (name && age <= 8) {
    return `Hi, I'm ${name}. ${base}`;
  }
  return event.speechIdeas[1] ?? base;
}

export function generateQuickActionLocal(input: QuickActionInput): QuickActionResult {
  const { type, event, childAge, childName, customTheme } = input;
  const theme = customTheme?.trim() || event.name;

  if (type === "speech") {
    const lines = [
      ageSpeechLine(event, childAge, childName),
      ...(event.speechIdeas.slice(1, 2)),
    ].filter(Boolean);
    return {
      type,
      title: `Speech for ${theme}`,
      intro: childAge <= 5
        ? "Short lines your little one can say on stage ❤️"
        : "Practice these lines aloud — clear and confident!",
      items: lines,
      source: "local",
    };
  }

  if (type === "costume") {
    const cat = event.costumeCategory as EventCategoryId | undefined;
    const chars = cat ? EVENT_CHARACTERS.filter((c) => c.category === cat).slice(0, 2) : [];
    const items = chars.length
      ? chars.flatMap((c) => [
          `${c.character}: ${c.materials.slice(0, 3).join(", ")}`,
          ...c.steps.slice(0, 2),
        ])
      : event.whatToPrepare.slice(0, 4);
    return {
      type,
      title: `Costume plan — ${theme}`,
      intro: `Quick DIY ideas using things at home (${childAge <= 6 ? "easy" : "school-ready"} level).`,
      items,
      source: "local",
    };
  }

  // checklist
  const extra =
    childAge <= 5
      ? ["Practice with a big smile", "Pack a comfort toy (optional)"]
      : childAge <= 10
      ? ["Record a practice video", "Label all props with name"]
      : ["Time your speech (under 1 min)", "Check school dress-code rules"];

  return {
    type,
    title: `Checklist — ${theme}`,
    intro: "Tick these off as you get ready. Amy picked essentials plus age-smart extras.",
    items: [...event.checklist, ...extra.slice(0, 2)],
    source: "local",
  };
}

/** Parse AI JSON into QuickActionResult with validation. */
export function parseQuickActionAiResponse(
  type: QuickActionType,
  raw: unknown,
  fallback: QuickActionResult,
): QuickActionResult {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const items = Array.isArray(o.items)
    ? o.items.map((x) => String(x).trim()).filter(Boolean).slice(0, 8)
    : [];
  if (items.length === 0) return fallback;
  return {
    type,
    title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : fallback.title,
    intro: typeof o.intro === "string" && o.intro.trim() ? o.intro.trim() : fallback.intro,
    items,
    source: "ai",
  };
}
