import { V2_ROUTE_REDIRECTS } from "./redirects";
import type { RouteRegistryEntry } from "./types";

/**
 * MVP route catalog — owners + lifecycle only (no AppCore wiring in Sprint 0).
 * Paths match existing AppCore routes plus planned V2 shell destinations.
 */
const CANONICAL_ENTRIES: RouteRegistryEntry[] = [
  // V2 shells (planned destinations; not mounted until later sprints)
  {
    path: "/front-door",
    owner: "front_door",
    featureId: "front_door",
    lifecycle: "canonical",
    notes: "New-install Front Door when new_front_door flag on",
  },
  {
    path: "/today",
    owner: "today",
    featureId: "today",
    lifecycle: "canonical",
    notes: "V2 companion home",
  },
  {
    path: "/ask-amy",
    owner: "ask_amy",
    featureId: "ask_amy",
    lifecycle: "canonical",
  },
  {
    path: "/for-child",
    owner: "for_child",
    featureId: "for_child",
    lifecycle: "canonical",
    notes: "Treasury shell — never Front Door",
  },

  // Auth / account
  {
    path: "/sign-in",
    owner: "account",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/sign-up",
    owner: "account",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/onboarding",
    owner: "migration",
    featureId: null,
    lifecycle: "deprecated",
    redirectTo: "/front-door",
    notes: "New users → Front Door; incomplete legacy → bridge",
  },
  {
    path: "/parent-profile",
    owner: "account",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/children",
    owner: "account",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/children/new",
    owner: "account",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/children/:id",
    owner: "account",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/notification-settings",
    owner: "account",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/manage-devices",
    owner: "account",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/pricing",
    owner: "premium",
    featureId: "premium",
    lifecycle: "canonical",
    notes: "Account Plan — not Front Door",
  },

  // Hero / speech
  {
    path: "/speech-coach",
    owner: "feature",
    featureId: "speech_coach",
    lifecycle: "canonical",
  },
  {
    path: "/speech-coach/talk",
    owner: "feature",
    featureId: "speech_coach",
    lifecycle: "canonical",
  },
  {
    path: "/speech-coach/live-session",
    owner: "feature",
    featureId: "speech_coach",
    lifecycle: "canonical",
  },
  {
    path: "/speech-coach-v2",
    owner: "feature",
    featureId: "speech_coach",
    lifecycle: "canonical",
  },
  {
    path: "/speech-coach-v2/session",
    owner: "feature",
    featureId: "speech_coach",
    lifecycle: "canonical",
  },
  {
    path: "/talking-amy",
    owner: "feature",
    featureId: "talking_amy",
    lifecycle: "canonical",
  },

  // Discoverable treasury (paths preserved)
  {
    path: "/games",
    owner: "feature",
    featureId: "games",
    lifecycle: "canonical",
  },
  {
    path: "/rewards",
    owner: "feature",
    featureId: "rewards",
    lifecycle: "canonical",
  },
  {
    path: "/discovery-worlds",
    owner: "feature",
    featureId: "discovery_worlds",
    lifecycle: "canonical",
  },
  {
    path: "/animal-world",
    owner: "feature",
    featureId: "animal_world",
    lifecycle: "canonical",
  },
  {
    path: "/worlds/:slug",
    owner: "feature",
    featureId: "discovery_worlds",
    lifecycle: "canonical",
  },
  {
    path: "/phonics",
    owner: "feature",
    featureId: "phonics",
    lifecycle: "canonical",
  },
  {
    path: "/study",
    owner: "feature",
    featureId: "study",
    lifecycle: "canonical",
  },
  {
    path: "/smart-math-tricks",
    owner: "feature",
    featureId: "smart_math_tricks",
    lifecycle: "canonical",
  },
  {
    path: "/nutrition",
    owner: "feature",
    featureId: "nutrition",
    lifecycle: "canonical",
  },
  {
    path: "/nutrition/share/:token",
    owner: "public",
    featureId: "nutrition",
    lifecycle: "canonical",
  },
  {
    path: "/health-lab",
    owner: "feature",
    featureId: "health_lab",
    lifecycle: "canonical",
  },
  {
    path: "/birth-sky",
    owner: "feature",
    featureId: "birth_sky",
    lifecycle: "canonical",
  },
  {
    path: "/routines",
    owner: "feature",
    featureId: "routines",
    lifecycle: "canonical",
  },
  {
    path: "/routines/generate",
    owner: "feature",
    featureId: "routines",
    lifecycle: "canonical",
  },
  {
    path: "/routines/:id",
    owner: "feature",
    featureId: "routines",
    lifecycle: "canonical",
  },
  {
    path: "/school-morning-flow",
    owner: "feature",
    featureId: "school_morning_flow",
    lifecycle: "canonical",
  },
  {
    path: "/rhymes",
    owner: "feature",
    featureId: "rhymes",
    lifecycle: "canonical",
  },
  {
    path: "/amy-coach",
    owner: "feature",
    featureId: "amy_coach",
    lifecycle: "canonical",
  },
  {
    path: "/amy-ai-tutor",
    owner: "feature",
    featureId: "amy_ai_tutor",
    lifecycle: "canonical",
  },
  {
    path: "/audio-lessons",
    owner: "feature",
    featureId: "audio_lessons",
    lifecycle: "canonical",
  },
  {
    path: "/life-skills",
    owner: "feature",
    featureId: "life_skills",
    lifecycle: "canonical",
  },
  {
    path: "/behavior",
    owner: "feature",
    featureId: "behavior",
    lifecycle: "canonical",
  },
  {
    path: "/progress",
    owner: "feature",
    featureId: "progress",
    lifecycle: "canonical",
  },
  {
    path: "/insights",
    owner: "feature",
    featureId: "insights",
    lifecycle: "canonical",
  },
  {
    path: "/parent-growth",
    owner: "feature",
    featureId: "parent_growth",
    lifecycle: "canonical",
  },
  {
    path: "/event-prep",
    owner: "feature",
    featureId: "event_prep",
    lifecycle: "canonical",
  },
  {
    path: "/worksheet",
    owner: "feature",
    featureId: "worksheet",
    lifecycle: "canonical",
  },
  {
    path: "/answer-to-kids-how",
    owner: "feature",
    featureId: "how_library",
    lifecycle: "canonical",
  },
  {
    path: "/referrals",
    owner: "feature",
    featureId: "referrals",
    lifecycle: "canonical",
  },

  // Hidden (deep link OK)
  {
    path: "/abacus",
    owner: "feature",
    featureId: "abacus",
    lifecycle: "canonical",
  },
  {
    path: "/spelling",
    owner: "feature",
    featureId: "spelling",
    lifecycle: "canonical",
  },
  {
    path: "/olympiad",
    owner: "feature",
    featureId: "olympiad",
    lifecycle: "canonical",
  },
  {
    path: "/recipes",
    owner: "feature",
    featureId: "recipes",
    lifecycle: "canonical",
  },
  {
    path: "/kids-control-center",
    owner: "feature",
    featureId: "kids_control_center",
    lifecycle: "canonical",
  },
  {
    path: "/environment",
    owner: "feature",
    featureId: "environment",
    lifecycle: "canonical",
  },

  // Public / marketing
  {
    path: "/privacy",
    owner: "public",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/terms",
    owner: "public",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/support",
    owner: "public",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/get-app",
    owner: "public",
    featureId: null,
    lifecycle: "canonical",
  },
  {
    path: "/speech-coach-app",
    owner: "public",
    featureId: "speech_coach",
    lifecycle: "canonical",
  },

  // Archived experiences (redirect targets recorded; do not reimplement as home)
  {
    path: "/dashboard",
    owner: "migration",
    featureId: null,
    lifecycle: "archived_experience",
    redirectTo: "/today",
    notes: "Dashboard-as-home retired",
  },
  {
    path: "/parenting-hub",
    owner: "migration",
    featureId: "for_child",
    lifecycle: "redirect",
    redirectTo: "/for-child",
    notes: "Hub index becomes For [Child] treasury",
  },
  {
    path: "/assistant",
    owner: "ask_amy",
    featureId: "ask_amy",
    lifecycle: "alias",
    redirectTo: "/ask-amy",
  },
  {
    path: "/subscription-trial",
    owner: "premium",
    featureId: "premium",
    lifecycle: "deprecated",
    redirectTo: "/today",
  },
];

function redirectEntries(): RouteRegistryEntry[] {
  const covered = new Set(CANONICAL_ENTRIES.map((e) => e.path));
  return V2_ROUTE_REDIRECTS.filter((r) => !covered.has(r.from)).map((r) => ({
    path: r.from,
    owner: "migration" as const,
    featureId: null,
    lifecycle: "redirect" as const,
    redirectTo: r.to,
    notes: r.reason,
  }));
}

export const V2_ROUTE_REGISTRY: readonly RouteRegistryEntry[] = [
  ...CANONICAL_ENTRIES,
  ...redirectEntries(),
];

export function getRouteEntry(path: string): RouteRegistryEntry | undefined {
  return V2_ROUTE_REGISTRY.find((entry) => entry.path === path);
}
