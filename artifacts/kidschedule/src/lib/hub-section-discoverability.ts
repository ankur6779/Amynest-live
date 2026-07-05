import type { TFunction } from "i18next";
import type { HubGroupKey } from "@/lib/parent-hub-premium";
import {
  getHubSectionVisitAt,
  getLastVisitedHubSection,
  hasVisitedHubSection,
} from "@/lib/hub-section-visit-tracker";
import { hubTilePreviewLabels } from "@/lib/hub-section-tile-labels";

export type HubDaypart = "morning" | "day" | "evening" | "bedtime";

export type HubSectionHighlightKind = "new" | "updated" | "recommended" | "continue";

export type HubSectionPreviewDisplay = {
  subtitle: string;
  /** Subtle secondary hint — never duplicates highlight label. */
  lastVisitedHint?: string;
  highlightLabel?: string;
  isPrimary: boolean;
};

export type HubSectionDiscoverabilityContext = {
  childId: number;
  groupKey: HubGroupKey;
  groupKeys: readonly HubGroupKey[];
  visibleTileIds: readonly string[];
  hasTodayRoutine: boolean;
  learningSessionPending: boolean;
  recommendationCount: number;
  t: TFunction;
};

const GROUP_ORDER: readonly HubGroupKey[] = [
  "today",
  "learning",
  "creativity",
  "stories",
  "health",
  "parent",
  "support",
];

export function getHubDaypart(now = new Date()): HubDaypart {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "bedtime";
}

export function pickPrimaryHubSectionKey(
  daypart: HubDaypart,
  hasTodayRoutine: boolean,
): HubGroupKey | null {
  if (hasTodayRoutine) return "today";
  if (daypart === "morning") return "learning";
  if (daypart === "bedtime") return "health";
  return null;
}

type HighlightPick = { key: HubGroupKey; kind: HubSectionHighlightKind } | null;

export function pickHubSectionHighlight(ctx: {
  childId: number;
  groupKeys: readonly HubGroupKey[];
  hasTodayRoutine: boolean;
  learningSessionPending: boolean;
  now?: number;
}): HighlightPick {
  const now = ctx.now ?? Date.now();
  const recentMs = 48 * 60 * 60 * 1000;

  const last = getLastVisitedHubSection(ctx.childId, ctx.groupKeys);
  if (last && now - last.at <= recentMs) {
    return { key: last.key, kind: "continue" };
  }

  if (ctx.learningSessionPending) {
    return { key: "learning", kind: "recommended" };
  }

  if (ctx.hasTodayRoutine) {
    return { key: "today", kind: "updated" };
  }

  for (const key of GROUP_ORDER) {
    if (!ctx.groupKeys.includes(key)) continue;
    if (!hasVisitedHubSection(ctx.childId, key)) {
      return { key, kind: "new" };
    }
  }

  return null;
}

function countLabel(
  t: TFunction,
  groupKey: HubGroupKey,
  count: number,
): string {
  const n = Math.max(count, 1);
  switch (groupKey) {
    case "learning":
    case "creativity":
      return t("parent_hub.section_preview.activities", { count: n });
    case "stories":
      return t("parent_hub.section_preview.stories", { count: n });
    case "parent":
      return t("parent_hub.section_preview.games", { count: Math.max(n, 6) });
    case "support":
      return t("parent_hub.section_preview.tools", { count: n });
    case "today":
      return t("parent_hub.section_preview.picks", { count: n });
    case "health":
      return t("parent_hub.section_preview.tools", { count: n });
    default:
      return t("parent_hub.section_preview.activities", { count: n });
  }
}

function buildTodaySubtitle(
  t: TFunction,
  tileIds: readonly string[],
  hasTodayRoutine: boolean,
  recommendationCount: number,
): string {
  const parts: string[] = [];
  if (hasTodayRoutine) {
    parts.push(t("parent_hub.section_preview.routine_ready"));
  } else if (tileIds.includes("generate-routine")) {
    parts.push(t("parent_hub.section_preview.create_routine"));
  }
  if (tileIds.includes("tomorrow-forecast")) {
    parts.push(t("parent_hub.section_preview.forecast_ready"));
  }
  const picks = Math.max(recommendationCount, tileIds.length);
  parts.push(t("parent_hub.section_preview.picks", { count: picks }));
  return parts.join(" • ");
}

function buildGroupSubtitle(
  t: TFunction,
  groupKey: HubGroupKey,
  tileIds: readonly string[],
  hasTodayRoutine: boolean,
  recommendationCount: number,
): string {
  if (groupKey === "today") {
    return buildTodaySubtitle(t, tileIds, hasTodayRoutine, recommendationCount);
  }

  if (groupKey === "health") {
    const labels = hubTilePreviewLabels(tileIds, 3);
    if (labels.length >= 2) return labels.join(" • ");
    return t("parent_hub.section_groups.collapsed_nav.health");
  }

  if (groupKey === "support") {
    const labels = hubTilePreviewLabels(tileIds, 3);
    const countPart = countLabel(t, groupKey, tileIds.length);
    const tail = labels.length > 0 ? labels.join(" • ") : t("parent_hub.section_groups.collapsed_nav.support");
    return `${countPart} • ${tail}`;
  }

  const countPart = countLabel(t, groupKey, tileIds.length);
  const labels = hubTilePreviewLabels(tileIds, 2);
  if (labels.length === 0) {
    return t(`parent_hub.section_groups.collapsed_nav.${groupKey === "parent" ? "parent" : groupKey}`);
  }
  return `${countPart} • ${labels.join(" • ")}`;
}

function highlightLabel(t: TFunction, kind: HubSectionHighlightKind): string {
  return t(`parent_hub.section_preview.highlights.${kind}`);
}

export function buildHubSectionPreviewDisplay(
  ctx: HubSectionDiscoverabilityContext & {
    daypart: HubDaypart;
    primaryKey: HubGroupKey | null;
    highlight: HighlightPick;
  },
): HubSectionPreviewDisplay {
  const subtitle = buildGroupSubtitle(
    ctx.t,
    ctx.groupKey,
    ctx.visibleTileIds,
    ctx.hasTodayRoutine,
    ctx.recommendationCount,
  );

  const isPrimary = ctx.primaryKey === ctx.groupKey;
  const isHighlight =
    ctx.highlight != null && ctx.highlight.key === ctx.groupKey;

  let lastVisitedHint: string | undefined;
  if (!isHighlight) {
    const visitedAt = getHubSectionVisitAt(ctx.childId, ctx.groupKey);
    if (visitedAt != null) {
      lastVisitedHint = ctx.t("parent_hub.section_preview.last_opened");
    }
  }

  return {
    subtitle,
    lastVisitedHint,
    highlightLabel: isHighlight ? highlightLabel(ctx.t, ctx.highlight!.kind) : undefined,
    isPrimary,
  };
}

export function buildAllHubSectionPreviews(input: {
  childId: number;
  groupTileIds: Record<HubGroupKey, readonly string[]>;
  groupKeys: readonly HubGroupKey[];
  hasTodayRoutine: boolean;
  learningSessionPending: boolean;
  recommendationCount: number;
  t: TFunction;
  now?: Date;
}): Record<HubGroupKey, HubSectionPreviewDisplay> {
  const daypart = getHubDaypart(input.now);
  const primaryKey = pickPrimaryHubSectionKey(daypart, input.hasTodayRoutine);
  const highlight = pickHubSectionHighlight({
    childId: input.childId,
    groupKeys: input.groupKeys,
    hasTodayRoutine: input.hasTodayRoutine,
    learningSessionPending: input.learningSessionPending,
    now: input.now?.getTime(),
  });

  const out = {} as Record<HubGroupKey, HubSectionPreviewDisplay>;
  for (const groupKey of input.groupKeys) {
    out[groupKey] = buildHubSectionPreviewDisplay({
      childId: input.childId,
      groupKey,
      groupKeys: input.groupKeys,
      visibleTileIds: input.groupTileIds[groupKey] ?? [],
      hasTodayRoutine: input.hasTodayRoutine,
      learningSessionPending: input.learningSessionPending,
      recommendationCount: input.recommendationCount,
      t: input.t,
      daypart,
      primaryKey,
      highlight,
    });
  }
  return out;
}
