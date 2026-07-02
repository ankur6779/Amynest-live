import type { MobileNavItem } from "@/lib/mobile-menu-config";

export type NavPremiumRouteId =
  | "dashboard"
  | "parenting-hub"
  | "amy-coach"
  | "nutrition"
  | "routines"
  | "games"
  | "amy-ai"
  | "amy-quick-tutor"
  | "kids-control"
  | "progress"
  | "insights"
  | "behavior"
  | "recipes"
  | "children"
  | "profile"
  | "pricing"
  | "referrals"
  | "feedback"
  | "sign-out";

const BASE = "/illustrations/nav";

export type NavPremiumVisual = {
  iconSrc: string;
  descriptionKey: string;
  defaultDescription: string;
};

export const NAV_PREMIUM_VISUALS: Record<NavPremiumRouteId, NavPremiumVisual> = {
  dashboard: {
    iconSrc: `${BASE}/dashboard-icon.png`,
    descriptionKey: "nav.descriptions.dashboard",
    defaultDescription: "Overview & summary",
  },
  "parenting-hub": {
    iconSrc: `${BASE}/parenting-hub-icon.png`,
    descriptionKey: "nav.descriptions.parenting_hub",
    defaultDescription: "Articles, tools & support",
  },
  "amy-coach": {
    iconSrc: `${BASE}/amy-coach-icon.png`,
    descriptionKey: "nav.descriptions.amy_coach",
    defaultDescription: "Learning goals & progress",
  },
  nutrition: {
    iconSrc: `${BASE}/nutrition-icon.png`,
    descriptionKey: "nav.descriptions.nutrition_hub",
    defaultDescription: "Meals, plans & tracker",
  },
  routines: {
    iconSrc: `${BASE}/routines-icon.png`,
    descriptionKey: "nav.descriptions.routines",
    defaultDescription: "Builder & tracking",
  },
  games: {
    iconSrc: `${BASE}/games-icon.png`,
    descriptionKey: "nav.descriptions.games",
    defaultDescription: "Rewards & safe play",
  },
  "amy-ai": {
    iconSrc: `${BASE}/amy-ai-icon.png`,
    descriptionKey: "nav.descriptions.amy_ai",
    defaultDescription: "Parenting assistant & chat",
  },
  "amy-quick-tutor": {
    iconSrc: `${BASE}/amy-ai-icon.png`,
    descriptionKey: "nav.descriptions.amy_quick_tutor",
    defaultDescription: "Quick learning help",
  },
  "kids-control": {
    iconSrc: `${BASE}/kids-control-icon.png`,
    descriptionKey: "nav.descriptions.kids_control_center",
    defaultDescription: "Screen time & safety",
  },
  progress: {
    iconSrc: `${BASE}/progress-icon.png`,
    descriptionKey: "nav.descriptions.progress",
    defaultDescription: "Milestones & streaks",
  },
  insights: {
    iconSrc: `${BASE}/insights-icon.png`,
    descriptionKey: "nav.descriptions.insights",
    defaultDescription: "Weekly reports & trends",
  },
  behavior: {
    iconSrc: `${BASE}/behavior-icon.png`,
    descriptionKey: "nav.descriptions.behavior",
    defaultDescription: "Patterns & guidance",
  },
  recipes: {
    iconSrc: `${BASE}/nutrition-icon.png`,
    descriptionKey: "nav.descriptions.my_recipes",
    defaultDescription: "Saved family meals",
  },
  children: {
    iconSrc: `${BASE}/profile-icon.png`,
    descriptionKey: "nav.descriptions.children",
    defaultDescription: "Manage child profiles",
  },
  profile: {
    iconSrc: `${BASE}/profile-icon.png`,
    descriptionKey: "nav.descriptions.profile",
    defaultDescription: "Account & preferences",
  },
  pricing: {
    iconSrc: `${BASE}/pricing-icon.png`,
    descriptionKey: "nav.descriptions.pricing",
    defaultDescription: "Plans & subscription",
  },
  referrals: {
    iconSrc: `${BASE}/referrals-icon.png`,
    descriptionKey: "nav.descriptions.referrals",
    defaultDescription: "Invite friends & earn",
  },
  feedback: {
    iconSrc: `${BASE}/feedback-icon.png`,
    descriptionKey: "nav.descriptions.feedback",
    defaultDescription: "Share your thoughts",
  },
  "sign-out": {
    iconSrc: `${BASE}/sign-out-icon.png`,
    descriptionKey: "nav.descriptions.sign_out",
    defaultDescription: "Log out of your account",
  },
};

export const NAV_PREMIUM_HEADER = {
  iconSrc: `${BASE}/header-icon.png`,
  heroSrc: `${BASE}/header-hero.png`,
  profileHeroSrc: `${BASE}/profile-hero.png`,
  profileAvatarSrc: `${BASE}/profile-avatar.png`,
};

/** Map route href → premium visual id. */
export const NAV_HREF_TO_PREMIUM_ID: Record<string, NavPremiumRouteId> = {
  "/dashboard": "dashboard",
  "/parenting-hub": "parenting-hub",
  "/amy-coach": "amy-coach",
  "/nutrition": "nutrition",
  "/routines": "routines",
  "/games": "games",
  "/assistant": "amy-ai",
  "/amy-ai-tutor": "amy-quick-tutor",
  "/kids-control-center": "kids-control",
  "/progress": "progress",
  "/insights": "insights",
  "/behavior": "behavior",
  "/recipes": "recipes",
  "/children": "children",
  "/parent-profile": "profile",
  "/pricing": "pricing",
  "/referrals": "referrals",
  "/feedback": "feedback",
};

export const NAV_PRIMARY_HREFS = [
  "/dashboard",
  "/parenting-hub",
  "/amy-coach",
  "/nutrition",
  "/routines",
  "/games",
  "/assistant",
  "/amy-ai-tutor",
  "/kids-control-center",
  "/progress",
  "/insights",
  "/behavior",
  "/recipes",
  "/children",
] as const;

export const NAV_ACCOUNT_HREFS = [
  "/parent-profile",
  "/pricing",
  "/referrals",
  "/feedback",
] as const;

export function getNavPremiumId(href: string): NavPremiumRouteId | undefined {
  return NAV_HREF_TO_PREMIUM_ID[href];
}

/* ── Mobile drawer grouping (premium redesign) ──────────────────────────────
 * Groups only affect the mobile navigation drawer, not the desktop sidebar.
 * Every existing route is placed into exactly one group; ordering here defines
 * the drawer's information hierarchy (profile-first, then most-used actions).
 */
export type NavDrawerGroupId = "primary" | "learning" | "insights" | "account";

export type NavDrawerGroup = {
  id: NavDrawerGroupId;
  labelKey: string;
  defaultLabel: string;
  hrefs: string[];
};

export const NAV_DRAWER_GROUPS: NavDrawerGroup[] = [
  {
    id: "primary",
    labelKey: "nav.groups.primary",
    defaultLabel: "Primary",
    hrefs: ["/dashboard", "/parenting-hub", "/amy-coach", "/nutrition", "/routines", "/assistant"],
  },
  {
    id: "learning",
    labelKey: "nav.groups.learning",
    defaultLabel: "Learning",
    hrefs: ["/study", "/games", "/amy-ai-tutor", "/children"],
  },
  {
    id: "insights",
    labelKey: "nav.groups.insights",
    defaultLabel: "Insights",
    hrefs: ["/progress", "/insights", "/behavior", "/kids-control-center"],
  },
  {
    id: "account",
    labelKey: "nav.groups.account",
    defaultLabel: "Account",
    hrefs: ["/pricing", "/referrals", "/recipes", "/feedback", "/parent-profile"],
  },
];

/** Partition the resolved menu into ordered drawer groups (drops unknown hrefs). */
export function groupDrawerItems(
  items: MobileNavItem[],
): { group: NavDrawerGroup; items: MobileNavItem[] }[] {
  const byHref = new Map(items.map((item) => [item.href, item]));
  return NAV_DRAWER_GROUPS.map((group) => ({
    group,
    items: group.hrefs
      .map((href) => byHref.get(href))
      .filter((item): item is MobileNavItem => Boolean(item)),
  })).filter((entry) => entry.items.length > 0);
}

export function splitNavItems(items: MobileNavItem[]): {
  primary: MobileNavItem[];
  account: MobileNavItem[];
} {
  const accountSet = new Set<string>(NAV_ACCOUNT_HREFS);
  const primary: MobileNavItem[] = [];
  const account: MobileNavItem[] = [];
  for (const item of items) {
    if (accountSet.has(item.href)) account.push(item);
    else primary.push(item);
  }
  return { primary, account };
}
