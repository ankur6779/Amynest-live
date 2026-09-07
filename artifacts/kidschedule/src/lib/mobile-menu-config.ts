import {
  Baby,
  Bot,
  BookOpen,
  Brain,
  Calendar,
  ChefHat,
  Gamepad2,
  Gift,
  GraduationCap,
  Home,
  MessageSquarePlus,
  MoonStar,
  Salad,
  Sparkles,
  Star,
  BarChart2,
  TrendingUp,
  UserCircle,
  Users,
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
  { href: "/birth-sky", labelKey: "nav.amy_astro_intelligence", icon: MoonStar },
  { href: "/parenting-hub", labelKey: "nav.parenting_hub", icon: BookOpen },
  { href: "/amy-coach", labelKey: "nav.amy_coach", icon: Brain },
  { href: "/nutrition", labelKey: "nav.nutrition_hub", icon: Salad },
  { href: "/routines", labelKey: "nav.routines", icon: Calendar },
  { href: "/study", labelKey: "nav.learning_zone", icon: GraduationCap },
  { href: "/games", labelKey: "nav.games", icon: Gamepad2 },
  { href: "/assistant", labelKey: "nav.amy_ai", icon: Bot },
  { href: "/amy-ai-tutor", labelKey: "nav.amy_quick_tutor", icon: Sparkles },
  {
    href: "/kids-control-center",
    labelKey: "nav.kids_control_center",
    icon: Baby,
    badge: "Soon 🚀",
  },
  { href: "/progress", labelKey: "nav.progress", icon: TrendingUp },
  { href: "/insights", labelKey: "nav.insights", icon: BarChart2 },
  { href: "/behavior", labelKey: "nav.behavior", icon: Star },
  { href: "/recipes", labelKey: "nav.my_recipes", icon: ChefHat },
  { href: "/children", labelKey: "nav.children", icon: Users },
  { href: "/parent-profile", labelKey: "nav.profile", icon: UserCircle },
  { href: "/pricing", labelKey: "nav.pricing", icon: Sparkles },
  { href: "/referrals", labelKey: "nav.referrals", icon: Gift },
  { href: "/feedback", labelKey: "nav.feedback", icon: MessageSquarePlus },
];

/** Minimal fallback when async menu load times out or fails. */
export const DEFAULT_MOBILE_MENU: MobileNavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: Home },
  { href: "/birth-sky", labelKey: "nav.amy_astro_intelligence", icon: MoonStar },
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
