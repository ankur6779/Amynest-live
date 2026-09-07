/**
 * Compact Home launchpad destinations — existing routes only.
 * Presentation / discoverability. No new modules.
 */

export type TodayCarePathId = "routines" | "speech-coach" | "amy" | "rooms";

export type TodayCarePath = {
  id: TodayCarePathId;
  title: string;
  purpose: string;
  href: string;
};

export function todayCarePathsHref(
  id: TodayCarePathId,
  _childId?: number | null,
): string {
  void _childId;
  if (id === "routines") return "/routines";
  if (id === "amy") return "/assistant";
  if (id === "rooms") return "/parenting-hub";
  return "/speech-coach";
}

/** Four existing rooms — not a marketing catalogue. */
export function buildTodayCarePaths(childId?: number | null): TodayCarePath[] {
  return [
    {
      id: "routines",
      title: "Today's plan",
      purpose: "See what comes next",
      href: todayCarePathsHref("routines", childId),
    },
    {
      id: "speech-coach",
      title: "Speech Coach",
      purpose: "Practice speaking together",
      href: todayCarePathsHref("speech-coach", childId),
    },
    {
      id: "amy",
      title: "Amy",
      purpose: "Ask for calm guidance",
      href: todayCarePathsHref("amy", childId),
    },
    {
      id: "rooms",
      title: "Rooms",
      purpose: "Help, understand, care, moments",
      href: todayCarePathsHref("rooms", childId),
    },
  ];
}
