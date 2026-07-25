/**
 * Tradition segment ViewModels (Pack 5 §7.1).
 */

import {
  getMansionStory,
  TRADITION_CARD_TEMPLATES,
  TRADITIONAL_CONTENT_VERSION,
  type TraditionCardCategory,
} from "../../constants/traditional-content";
import type { TraditionalData } from "../../domain/models/traditional-data";

export type TraditionCardVM = {
  id: string;
  category: TraditionCardCategory;
  eyebrow: "In tradition";
  title: string;
  summary: string;
  story: string;
  locked: boolean;
  lockHint?: string;
  sourceTag: string;
};

export type TraditionSegmentVM = {
  traditionalContentVersion: string;
  snapshotVersion: string;
  mode: "full" | "day_sky";
  traditionLimited: boolean;
  disclaimer: string;
  daySkyNote: string | null;
  visibleCards: TraditionCardVM[];
  moreCards: TraditionCardVM[];
  status: "ready" | "empty_hidden" | "error";
  errorMessage?: string;
};

function applyPlaceholders(text: string, data: TraditionalData): string {
  return text
    .split("{{moonSign}}")
    .join(data.moonSign)
    .split("{{sunSign}}")
    .join(data.sunSign)
    .split("{{moonPhaseLabel}}")
    .join(data.moonPhaseLabel)
    .split("{{risingSign}}")
    .join(data.risingSign ?? "the rising sky");
}

export function buildTraditionSegmentVM(
  data: TraditionalData | null,
  options: { showTradition: boolean; errorMessage?: string },
): TraditionSegmentVM {
  if (options.errorMessage) {
    return {
      traditionalContentVersion: TRADITIONAL_CONTENT_VERSION,
      snapshotVersion: data?.snapshotVersion ?? "",
      mode: data?.mode ?? "full",
      traditionLimited: false,
      disclaimer: "",
      daySkyNote: null,
      visibleCards: [],
      moreCards: [],
      status: "error",
      errorMessage: options.errorMessage,
    };
  }

  if (!options.showTradition) {
    return {
      traditionalContentVersion: TRADITIONAL_CONTENT_VERSION,
      snapshotVersion: data?.snapshotVersion ?? "",
      mode: data?.mode ?? "full",
      traditionLimited: false,
      disclaimer:
        "Traditional stories are turned off. Astronomy and Sky remain available.",
      daySkyNote: null,
      visibleCards: [],
      moreCards: [],
      status: "empty_hidden",
    };
  }

  if (!data) {
    return {
      traditionalContentVersion: TRADITIONAL_CONTENT_VERSION,
      snapshotVersion: "",
      mode: "full",
      traditionLimited: false,
      disclaimer: "",
      daySkyNote: null,
      visibleCards: [],
      moreCards: [],
      status: "error",
      errorMessage: "Traditional stories unavailable right now. Try again shortly.",
    };
  }

  const daySky = data.mode === "day_sky" || data.timePrecision === "unknown";
  const cards: TraditionCardVM[] = [];

  for (const tpl of TRADITION_CARD_TEMPLATES) {
    if (tpl.id === "trad_moon_mansion") {
      const mansion = getMansionStory(data.lunarMansionKey);
      cards.push({
        id: `trad_moon_mansion_${data.lunarMansionKey}`,
        category: "lunar_mansion",
        eyebrow: "In tradition",
        title: mansion.title,
        summary: mansion.summary,
        story: mansion.story,
        locked: false,
        sourceTag: `Traditional lens · ${data.traditionalContentVersion}`,
      });
      continue;
    }

    const locked = tpl.requiresExactTime && daySky;
    cards.push({
      id: tpl.id,
      category: tpl.category,
      eyebrow: "In tradition",
      title: tpl.title,
      summary: tpl.summary,
      story: applyPlaceholders(tpl.story, data),
      locked,
      lockHint: locked
        ? "Some traditional details need an exact birth time. Your Day Sky stories still have meaning."
        : undefined,
      sourceTag: `Traditional lens · ${data.traditionalContentVersion}`,
    });
  }

  const unlocked = cards.filter((c) => !c.locked);
  const locked = cards.filter((c) => c.locked);
  const ordered = [...unlocked, ...locked];
  const initialCount = Math.min(4, ordered.length);

  return {
    traditionalContentVersion: data.traditionalContentVersion,
    snapshotVersion: data.snapshotVersion,
    mode: data.mode,
    traditionLimited: daySky,
    disclaimer:
      "These are cultural traditions and historical interpretations — not scientific proof, and not a prediction about your child’s future.",
    daySkyNote: daySky
      ? "Some traditional details need an exact birth time. Your Day Sky stories still have meaning."
      : null,
    visibleCards: ordered.slice(0, initialCount),
    moreCards: ordered.slice(initialCount),
    status: "ready",
  };
}
