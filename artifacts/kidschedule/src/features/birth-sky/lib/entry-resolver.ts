/**
 * Entry resolver (Pack 1 §3.2, Pack 3 deep-link guards, Pack 4 dashboard).
 */

export type BirthSkyEntryReferrer =
  | "parenting_hub"
  | "dashboard_widget"
  | "child_profile"
  | "child_intelligence"
  | "deep_link"
  | "amy_coach"
  | "unknown";

export type BirthSkySetupStep =
  | "child"
  | "date"
  | "time"
  | "place"
  | "consent"
  | "review";

export type BirthSkyDashboardSegment = "sky" | "astronomy" | "tradition" | "reflect";

export type BirthSkySettingsSubpage =
  | "root"
  | "preferences"
  | "birth_details"
  | "privacy"
  | "export"
  | "about"
  | "snapshots";

export type BirthSkyResolvedLanding =
  | { land: "unavailable"; reason: "flag_off" | "deep_links_off" }
  | { land: "welcome" }
  | { land: "setup"; step: BirthSkySetupStep }
  | { land: "formation" }
  | { land: "reveal" }
  | { land: "dashboard"; segment: BirthSkyDashboardSegment }
  | { land: "settings"; subpage: BirthSkySettingsSubpage }
  | { land: "privacy" }
  | { land: "redirect"; to: string; reason: string };

const CEREMONY_BLOCKED = new Set([
  "/birth-sky/formation",
  "/birth-sky/reveal",
]);

export function normalizeBirthSkyPath(path: string): string {
  const base = path.split(/[?#]/)[0] || "/birth-sky";
  const trimmed = base.replace(/\/+$/, "") || "/";
  if (trimmed === "/birth-sky/dashboard") return "/birth-sky/app";
  return trimmed;
}

function parseDashboardSegment(path: string): BirthSkyDashboardSegment {
  if (path.startsWith("/birth-sky/app/astronomy")) return "astronomy";
  if (path.startsWith("/birth-sky/app/tradition")) return "tradition";
  if (path.startsWith("/birth-sky/app/reflect")) return "reflect";
  return "sky";
}

export function resolveBirthSkyEntry(options: {
  path: string;
  enabled: boolean;
  deepLinksEnabled: boolean;
  hasCommittedProfile: boolean;
  hasSnapshot: boolean;
  revealCompleted: boolean;
  isDeepLink: boolean;
  allowFormationRoute?: boolean;
  allowRevealRoute?: boolean;
}): BirthSkyResolvedLanding {
  const path = normalizeBirthSkyPath(options.path);

  if (!options.enabled) {
    return { land: "unavailable", reason: "flag_off" };
  }

  if (options.isDeepLink && !options.deepLinksEnabled) {
    return { land: "unavailable", reason: "deep_links_off" };
  }

  if (CEREMONY_BLOCKED.has(path)) {
    if (path === "/birth-sky/formation" && options.allowFormationRoute) {
      return { land: "formation" };
    }
    if (path === "/birth-sky/reveal" && options.allowRevealRoute) {
      return { land: "reveal" };
    }
    if (options.hasCommittedProfile && !options.hasSnapshot) {
      return { land: "formation" };
    }
    if (options.hasCommittedProfile && options.hasSnapshot && !options.revealCompleted) {
      return { land: "reveal" };
    }
    if (options.hasCommittedProfile && options.hasSnapshot) {
      return { land: "dashboard", segment: "sky" };
    }
    return {
      land: "redirect",
      to: "/birth-sky/welcome",
      reason: "formation_reveal_not_deep_linkable",
    };
  }

  if (path.startsWith("/birth-sky/app")) {
    if (!options.hasCommittedProfile) return { land: "welcome" };
    if (!options.hasSnapshot) return { land: "formation" };
    if (!options.revealCompleted) return { land: "reveal" };
    return { land: "dashboard", segment: parseDashboardSegment(path) };
  }

  if (path === "/birth-sky" || path === "/birth-sky/welcome") {
    if (options.hasCommittedProfile && options.hasSnapshot && options.revealCompleted) {
      return { land: "dashboard", segment: "sky" };
    }
    if (options.hasCommittedProfile && options.hasSnapshot) {
      return { land: "reveal" };
    }
    if (options.hasCommittedProfile && !options.hasSnapshot) {
      return { land: "formation" };
    }
    return { land: "welcome" };
  }

  if (path === "/birth-sky/setup" || path === "/birth-sky/setup/child") {
    return { land: "setup", step: "child" };
  }

  if (path.startsWith("/birth-sky/setup/")) {
    const step = path.replace("/birth-sky/setup/", "") as BirthSkySetupStep;
    if (
      step === "child" ||
      step === "date" ||
      step === "time" ||
      step === "place" ||
      step === "consent" ||
      step === "review"
    ) {
      return { land: "setup", step };
    }
    return {
      land: "redirect",
      to: "/birth-sky/setup/child",
      reason: "unknown_setup_step",
    };
  }

  // Pack 7 — Settings / Privacy require a committed profile; offline readable via cache host.
  if (path === "/birth-sky/settings" || path.startsWith("/birth-sky/settings/")) {
    if (!options.hasCommittedProfile) {
      return { land: "redirect", to: "/birth-sky/welcome", reason: "settings_needs_profile" };
    }
    const sub = path.replace("/birth-sky/settings/", "").replace("/birth-sky/settings", "");
    const subpage: BirthSkySettingsSubpage =
      sub === "preferences" ||
      sub === "birth_details" ||
      sub === "privacy" ||
      sub === "export" ||
      sub === "about" ||
      sub === "snapshots"
        ? sub
        : "root";
    return { land: "settings", subpage };
  }

  if (path === "/birth-sky/privacy") {
    if (!options.hasCommittedProfile) {
      return { land: "redirect", to: "/birth-sky/welcome", reason: "privacy_needs_profile" };
    }
    return { land: "privacy" };
  }

  return { land: "welcome" };
}

export const BIRTH_SKY_KILL_SWITCH_PROBE_PATHS = [
  "/birth-sky",
  "/birth-sky/welcome",
  "/birth-sky/setup",
  "/birth-sky/setup/child",
  "/birth-sky/setup/date",
  "/birth-sky/reveal",
  "/birth-sky/formation",
  "/birth-sky/app",
  "/birth-sky/dashboard",
  "/birth-sky/settings",
  "/birth-sky/privacy",
] as const;
