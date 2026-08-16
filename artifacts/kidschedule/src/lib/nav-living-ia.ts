/**
 * Living AmyNest home navigation IA (presentation only).
 * Routes are preserved. Hierarchy answers "where can I go from home?"
 * not "what features does this app contain?"
 */
import {
  Baby,
  BarChart2,
  BookOpen,
  Brain,
  Calendar,
  ChefHat,
  Heart,
  Gamepad2,
  Gift,
  HeartHandshake,
  Home,
  MessageSquarePlus,
  MoonStar,
  Salad,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  livingAmyCoachNavDescription,
  livingAmyCoachNavLabel,
} from "@/lib/amy-coach/living-room";
import { PARENT_HUB_ROOM_IDS, type ParentHubRoomId } from "@/lib/parent-hub/rooms";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import type { MobileNavItem } from "@/lib/mobile-menu-config";

export type LivingNavGroupId = "home" | "care" | "beside_you" | "rooms" | "more";

export type LivingNavEmphasis = "primary" | "room" | "quiet";

export type LivingNavRow = {
  href: string;
  label: string;
  description?: string;
  emphasis: LivingNavEmphasis;
  icon: LucideIcon;
  mark?: "amy-ai";
  /** True when this row is a Rooms V1 door over /parenting-hub. */
  roomId?: ParentHubRoomId;
};

export type LivingNavSection = {
  id: LivingNavGroupId;
  label: string | null;
  items: LivingNavRow[];
};

/** Approved identity supporting line — Visual Identity locked promise. */
export const LIVING_NAV_HOME_LINE = "Today's next right thing";

export const LIVING_NAV_BRAND = "AmyNest";

export function parentingHubRoomHref(room: ParentHubRoomId): string {
  return `/parenting-hub#${room}`;
}

function livingHomeDescription(): string {
  return "Today's next right thing";
}

function livingRoutinesDescription(): string {
  return "Build today's plan";
}

function livingAmyDescription(): string {
  return "Talk whenever you need";
}

const ROOM_ICON: Record<ParentHubRoomId, LucideIcon> = {
  help: HeartHandshake,
  understand: BookOpen,
  care: Heart,
  moments: Sparkles,
};

function roomRow(room: ParentHubRoomId): LivingNavRow {
  const hero = ROOM_HEROES[room];
  return {
    href: parentingHubRoomHref(room),
    label: hero.titleFallback,
    description: hero.feelingFallback,
    emphasis: "room",
    icon: ROOM_ICON[room],
    roomId: room,
  };
}

const HREF_ICON: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/routines": Calendar,
  "/amy-coach": Brain,
  "/assistant": HeartHandshake,
  "/parenting-hub": BookOpen,
  "/birth-sky": MoonStar,
  "/nutrition": Salad,
  "/study": BookOpen,
  "/games": Gamepad2,
  "/amy-ai-tutor": Sparkles,
  "/children": Users,
  "/progress": TrendingUp,
  "/insights": BarChart2,
  "/behavior": Star,
  "/kids-control-center": Baby,
  "/recipes": ChefHat,
  "/pricing": Sparkles,
  "/referrals": Gift,
  "/feedback": MessageSquarePlus,
  "/parent-profile": UserCircle,
};

const QUIET_COPY: Record<string, { label: string; description?: string }> = {
  "/birth-sky": { label: "Birth Sky", description: "Soft identity, when you want it" },
  "/nutrition": { label: "Nutrition", description: "Meals for this body" },
  "/study": { label: "Learning", description: "Skills and practice" },
  "/games": { label: "Play", description: "Safe play together" },
  "/amy-ai-tutor": { label: "Quick help", description: "A short learning moment" },
  "/children": { label: "Children", description: "Who you're with" },
  "/progress": { label: "Progress" },
  "/insights": { label: "Insights" },
  "/behavior": { label: "Patterns" },
  "/kids-control-center": { label: "Kids Control" },
  "/recipes": { label: "Recipes" },
  "/pricing": { label: "Plans" },
  "/referrals": { label: "Invite" },
  "/feedback": { label: "Feedback" },
  "/parent-profile": { label: "Account" },
};

function rowFromItem(item: MobileNavItem): LivingNavRow {
  if (item.href === "/dashboard") {
    return {
      href: item.href,
      label: "Home",
      description: livingHomeDescription(),
      emphasis: "primary",
      icon: HREF_ICON[item.href] ?? item.icon,
    };
  }
  if (item.href === "/routines") {
    return {
      href: item.href,
      label: "Today's plan",
      description: livingRoutinesDescription(),
      emphasis: "primary",
      icon: HREF_ICON[item.href] ?? item.icon,
    };
  }
  if (item.href === "/amy-coach") {
    return {
      href: item.href,
      label: livingAmyCoachNavLabel(),
      description: livingAmyCoachNavDescription(),
      emphasis: "primary",
      icon: HREF_ICON[item.href] ?? item.icon,
    };
  }
  if (item.href === "/assistant") {
    return {
      href: item.href,
      label: "Amy",
      description: livingAmyDescription(),
      emphasis: "primary",
      icon: HREF_ICON[item.href] ?? item.icon,
      mark: "amy-ai",
    };
  }
  const quiet = QUIET_COPY[item.href];
  return {
    href: item.href,
    label: quiet?.label ?? item.labelKey,
    description: quiet?.description,
    emphasis: "quiet",
    icon: HREF_ICON[item.href] ?? item.icon,
  };
}

function take(byHref: Map<string, MobileNavItem>, href: string): MobileNavItem | undefined {
  const item = byHref.get(href);
  if (item) byHref.delete(href);
  return item;
}

/**
 * Living home hierarchy. Every incoming href is placed in exactly one section.
 * Rooms V1 doors are added as presentation rows over /parenting-hub — same route.
 */
export function buildLivingNavSections(items: MobileNavItem[]): LivingNavSection[] {
  const byHref = new Map(items.map((item) => [item.href, item]));
  const sections: LivingNavSection[] = [];

  const homeItem = take(byHref, "/dashboard");
  if (homeItem) {
    sections.push({
      id: "home",
      label: null,
      items: [rowFromItem(homeItem)],
    });
  }

  const careItems: LivingNavRow[] = [];
  const routines = take(byHref, "/routines");
  if (routines) careItems.push(rowFromItem(routines));
  if (careItems.length) {
    sections.push({ id: "care", label: null, items: careItems });
  }

  const beside: LivingNavRow[] = [];
  const coach = take(byHref, "/amy-coach");
  const amy = take(byHref, "/assistant");
  if (coach) beside.push(rowFromItem(coach));
  if (amy) beside.push(rowFromItem(amy));
  if (beside.length) {
    sections.push({ id: "beside_you", label: null, items: beside });
  }

  take(byHref, "/parenting-hub");
  sections.push({
    id: "rooms",
    label: "Rooms",
    items: PARENT_HUB_ROOM_IDS.map((room) => roomRow(room)),
  });

  const leftover = [...byHref.values()].map((item) => rowFromItem(item));
  leftover.sort((a, b) => {
    const order = [
      "/birth-sky",
      "/nutrition",
      "/study",
      "/games",
      "/amy-ai-tutor",
      "/children",
      "/progress",
      "/insights",
      "/behavior",
      "/kids-control-center",
      "/recipes",
      "/pricing",
      "/referrals",
      "/feedback",
      "/parent-profile",
    ];
    return order.indexOf(a.href) - order.indexOf(b.href);
  });
  if (leftover.length) {
    sections.push({ id: "more", label: "More", items: leftover });
  }

  return sections.filter((section) => section.items.length > 0);
}

/** Every source href must remain reachable after living grouping. */
export function preservedLivingNavHrefs(items: MobileNavItem[]): string[] {
  const sections = buildLivingNavSections(items);
  const hrefs = new Set<string>();
  for (const section of sections) {
    for (const row of section.items) {
      hrefs.add(row.href.split("#")[0] ?? row.href);
    }
  }
  return [...hrefs];
}
