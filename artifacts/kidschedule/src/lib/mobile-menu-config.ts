import {
  Baby,
  Bot,
  BookOpen,
  Brain,
  Calendar,
  ChefHat,
  Gamepad2,
  Gift,
  Home,
  MessageSquarePlus,
  Salad,
  Sparkles,
  Star,
  BarChart2,
  TrendingUp,
  Trophy,
  UserCircle,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";

export type MobileNavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  badge?: string;
};

/** Full mobile nav — always available synchronously. */
export const NAV_ITEMS: MobileNavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: Home },
  { href: "/parenting-hub", labelKey: "nav.parenting_hub", icon: BookOpen },
  { href: "/amy-coach", labelKey: "nav.amy_coach", icon: Brain },
  {
    href: "/kids-control-center",
    labelKey: "nav.kids_control_center",
    icon: Baby,
    badge: "Soon 🚀",
  },
  { href: "/children", labelKey: "nav.children", icon: Users },
  { href: "/routines", labelKey: "nav.routines", icon: Calendar },
  { href: "/progress", labelKey: "nav.progress", icon: TrendingUp },
  { href: "/insights", labelKey: "nav.insights", icon: BarChart2 },
  { href: "/rewards", labelKey: "nav.rewards", icon: Trophy },
  { href: "/behavior", labelKey: "nav.behavior", icon: Star },
  { href: "/assistant", labelKey: "nav.amy_ai", icon: Bot },
  { href: "/games", labelKey: "nav.games", icon: Gamepad2 },
  { href: "/recipes", labelKey: "nav.my_recipes", icon: ChefHat },
  { href: "/nutrition", labelKey: "nav.nutrition_hub", icon: Salad },
  { href: "/parent-profile", labelKey: "nav.profile", icon: UserCircle },
  { href: "/pricing", labelKey: "nav.pricing", icon: Sparkles },
  { href: "/referrals", labelKey: "nav.referrals", icon: Gift },
  { href: "/environment", labelKey: "nav.environment", icon: Wind },
  { href: "/feedback", labelKey: "nav.feedback", icon: MessageSquarePlus },
];

/** Minimal fallback when async menu load times out or fails. */
export const DEFAULT_MOBILE_MENU: MobileNavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: Home },
  { href: "/routines", labelKey: "nav.routines", icon: Calendar },
  { href: "/amy-coach", labelKey: "nav.amy_coach", icon: Brain },
  { href: "/parenting-hub", labelKey: "nav.parenting_hub", icon: BookOpen },
];

const MENU_LOAD_TIMEOUT_MS = 3000;

/** Reserved for remote menu config; resolves to full local nav today. */
export async function getMenuData(): Promise<MobileNavItem[]> {
  return NAV_ITEMS;
}

export async function getMenuDataWithTimeout(
  timeoutMs = MENU_LOAD_TIMEOUT_MS,
): Promise<MobileNavItem[]> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("menu-load-timeout")), timeoutMs);
  });
  return Promise.race([getMenuData(), timeout]);
}

export function resolveSafeMenu(menuData: MobileNavItem[] | null | undefined): MobileNavItem[] {
  return menuData?.length ? menuData : DEFAULT_MOBILE_MENU;
}
