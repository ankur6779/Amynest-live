/**
 * Compact Home launchpad — existing routes only.
 * Age-aware, stage-aware. Never a marketing catalogue.
 */
import {
  resolveDiscoveryStage,
  type DiscoveryStage,
} from "@/lib/day0-discovery";
import {
  ageGroupFromParts,
  isInfantCareDiscoveryAge,
  totalMonthsFromParts,
} from "@/lib/discovery/registry";
import type { AgeGroup } from "@/lib/age-groups";

export type TodayCarePathId =
  | "routines"
  | "speech-coach"
  | "amy"
  | "rooms"
  | "play"
  | "grow"
  | "care"
  | "progress";

export type TodayCarePath = {
  id: TodayCarePathId;
  title: string;
  purpose: string;
  href: string;
};

export type TodayCarePathInput = {
  childId?: number | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  routineCount?: number;
  stage?: DiscoveryStage;
};

const PATHS: Record<TodayCarePathId, Omit<TodayCarePath, "id">> = {
  routines: {
    title: "Today's plan",
    purpose: "See what comes next",
    href: "/routines",
  },
  "speech-coach": {
    title: "Speech Coach",
    purpose: "Practice speaking together",
    href: "/speech-coach",
  },
  amy: {
    title: "Amy",
    purpose: "Ask for calm guidance",
    href: "/assistant",
  },
  rooms: {
    title: "Rooms",
    purpose: "Help, understand, care, moments",
    href: "/parenting-hub",
  },
  play: {
    title: "Play",
    purpose: "A short game together",
    href: "/games",
  },
  grow: {
    title: "Grow",
    purpose: "Skills and practice",
    href: "/parenting-hub#understand",
  },
  care: {
    title: "Care",
    purpose: "Sleep, feed, and today's body",
    href: "/parenting-hub#care",
  },
  progress: {
    title: "Progress",
    purpose: "What is taking shape",
    href: "/progress",
  },
};

export function todayCarePathsHref(
  id: TodayCarePathId,
  _childId?: number | null,
): string {
  void _childId;
  return PATHS[id].href;
}

const MAX_HOME_DOORS = 5;

/**
 * Ordered Home doors for the child's group and discovery stage.
 * Before a plan: empty — the NRT hero already owns the plan CTA.
 */
export function homeDoorIdsForAge(
  group: AgeGroup,
  totalMonths: number,
  stage: DiscoveryStage,
): TodayCarePathId[] {
  if (stage === "before_plan") return [];

  const rooms = stage === "first_action";
  const progress = stage === "first_action";
  const infantCare = isInfantCareDiscoveryAge(totalMonths);
  const speechOk = totalMonths < 132;

  if (infantCare) {
    return pickDoors(
      [
        "routines",
        "amy",
        "care",
        group !== "infant" ? "play" : null,
        rooms ? "rooms" : speechOk ? "speech-coach" : null,
      ],
    );
  }

  if (group === "toddler") {
    return pickDoors(
      [
        "routines",
        "play",
        "amy",
        speechOk ? "speech-coach" : null,
        rooms ? "rooms" : "grow",
      ],
    );
  }

  if (group === "preschool") {
    return pickDoors(
      [
        "routines",
        "grow",
        "play",
        "amy",
        rooms ? "rooms" : speechOk ? "speech-coach" : null,
      ],
    );
  }

  if (group === "early_school") {
    return pickDoors(
      [
        "routines",
        "grow",
        "play",
        "amy",
        rooms ? "rooms" : speechOk ? "speech-coach" : null,
      ],
    );
  }

  return pickDoors(
    [
      "routines",
      "grow",
      "amy",
      progress ? "progress" : speechOk ? "speech-coach" : "play",
      rooms ? "rooms" : "play",
    ],
  );
}

function pickDoors(ids: Array<TodayCarePathId | null | false | undefined>): TodayCarePathId[] {
  const seen = new Set<TodayCarePathId>();
  const out: TodayCarePathId[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_HOME_DOORS) break;
  }
  return out;
}

function door(id: TodayCarePathId): TodayCarePath {
  return { id, ...PATHS[id] };
}

/** @deprecated Prefer the options object. Kept so existing tests can pass a childId. */
export function buildTodayCarePaths(
  childIdOrInput?: number | null | TodayCarePathInput,
): TodayCarePath[] {
  const input: TodayCarePathInput =
    childIdOrInput != null && typeof childIdOrInput === "object"
      ? childIdOrInput
      : { childId: childIdOrInput ?? null };

  const stage = input.stage ?? resolveDiscoveryStage(input.routineCount ?? 0);
  const years = input.ageYears ?? 0;
  const months = input.ageMonths ?? 0;
  const group = ageGroupFromParts(years, months);
  const total = totalMonthsFromParts(years, months);
  return homeDoorIdsForAge(group, total, stage).map(door);
}
