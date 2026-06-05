/**
 * Timeline collapse — show anchors + current window; group the rest.
 * UI-only; does not change routine data.
 */
import {
  isBedtimeAnchorItem,
  isDinnerAnchorItem,
} from "@/lib/routine-detail-premium";
import { parseRoutineTimeToMinutes } from "@/lib/routine-timeline-ui";

export type TimelineCollapseGroup = {
  id: string;
  label: string;
  hiddenCount: number;
};

export type TimelineRenderEntry =
  | { kind: "item"; origIdx: number }
  | { kind: "collapse"; group: TimelineCollapseGroup };

type CollapseItem = {
  time: string;
  activity: string;
  category?: string;
  status?: string;
};

const DEFAULT_MIN_ITEMS = 9;

function phaseLabelForTime(time: string): string {
  const mins = parseRoutineTimeToMinutes(time);
  if (mins < 0) return "activities";
  if (mins < 12 * 60) return "morning activities";
  if (mins < 17 * 60) return "afternoon activities";
  return "evening activities";
}

function formatCollapseLabel(items: CollapseItem[], hiddenOrigIndices: number[]): string {
  const first = items[hiddenOrigIndices[0]!];
  if (!first) {
    return `${hiddenOrigIndices.length} more activities`;
  }
  const phase = phaseLabelForTime(first.time);
  const n = hiddenOrigIndices.length;
  return `${n} more ${phase}`;
}

export function getPinnedTimelineIndices(
  items: CollapseItem[],
  currentIndex: number,
  nextUpIndex: number,
): Set<number> {
  const pinned = new Set<number>();

  if (currentIndex >= 0) pinned.add(currentIndex);

  let added = 0;
  const startFrom =
    currentIndex >= 0
      ? currentIndex + 1
      : nextUpIndex >= 0
        ? nextUpIndex
        : 0;

  for (let i = startFrom; i < items.length && added < 2; i++) {
    const status = items[i]?.status ?? "pending";
    if (status === "pending") {
      pinned.add(i);
      added++;
    }
  }

  items.forEach((it, i) => {
    if (
      isDinnerAnchorItem(it.category ?? "", it.activity) ||
      isBedtimeAnchorItem(it.category ?? "", it.activity)
    ) {
      pinned.add(i);
    }
  });

  return pinned;
}

export function buildTimelineRenderEntries(opts: {
  allItems: CollapseItem[];
  displayItems: Array<{ item: CollapseItem; origIdx: number }>;
  currentIndex: number;
  nextUpIndex: number;
  fullyExpanded: boolean;
  minItemsToCollapse?: number;
}): TimelineRenderEntry[] {
  const {
    allItems,
    displayItems,
    currentIndex,
    nextUpIndex,
    fullyExpanded,
    minItemsToCollapse = DEFAULT_MIN_ITEMS,
  } = opts;

  if (displayItems.length === 0) return [];

  const items = displayItems.map((d) => d.item);
  const origIndices = displayItems.map((d) => d.origIdx);

  if (fullyExpanded || displayItems.length < minItemsToCollapse) {
    return origIndices.map((origIdx) => ({ kind: "item" as const, origIdx }));
  }

  const pinnedDisplayPositions = new Set<number>();
  const pinnedOrig = getPinnedTimelineIndices(allItems, currentIndex, nextUpIndex);

  displayItems.forEach((d, displayPos) => {
    if (pinnedOrig.has(d.origIdx)) pinnedDisplayPositions.add(displayPos);
  });

  const entries: TimelineRenderEntry[] = [];
  let hiddenRun: number[] = [];

  const flushHidden = () => {
    if (hiddenRun.length === 0) return;
    const hiddenOrig = hiddenRun.map((pos) => origIndices[pos]!);
    entries.push({
      kind: "collapse",
      group: {
        id: `collapse-${hiddenOrig[0]}`,
        label: formatCollapseLabel(items, hiddenRun),
        hiddenCount: hiddenRun.length,
      },
    });
    hiddenRun = [];
  };

  for (let pos = 0; pos < displayItems.length; pos++) {
    if (pinnedDisplayPositions.has(pos)) {
      flushHidden();
      entries.push({ kind: "item", origIdx: origIndices[pos]! });
    } else {
      hiddenRun.push(pos);
    }
  }
  flushHidden();

  return entries;
}
