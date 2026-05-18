import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, Users, Calendar, Star, LogOut, UserCircle, Baby, Bot, TrendingUp, BookOpen, Brain, Moon, Sun, Sparkles, Gamepad2, Gift, ChefHat, Salad, BarChart2, Trophy, Wind, MessageSquarePlus } from "lucide-react";
import { useClerk, useUser } from "@/lib/firebase-auth-hooks";
import { LayoutMobileMenu } from "@/components/layout-mobile-menu";
import { logNavEvent } from "@/lib/navigation-log";
import { safePathStartsWith, safePathStartsWithSegment } from "@/lib/safe-route";
import {
  getUserAvatarUrl,
  getUserDisplayName,
  getUserEmail,
  getUserInitials,
} from "@/lib/safe-user-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";
import { AmyFab } from "@/components/amy-fab";
import { AmyIcon } from "@/components/amy-icon";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useTheme } from "@/contexts/theme-context";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { usePushRegistration } from "@/hooks/use-push-registration";
import { useCapacitorPushRegistrationSync } from "@/hooks/use-capacitor-push-registration-sync";
import { NotificationNudgeBanner } from "@/components/notification-nudge-banner";
import { NotificationPromptModal } from "@/components/notification-prompt-modal";
import { SpotlightTour } from "@/components/spotlight-tour";
function SmartParentBadge({
  className = ""
}: {
  className?: string;
}) {
  const {
    t
  } = useTranslation();
  return <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`} data-testid="badge-smart-parent">
      <Sparkles className="h-2.5 w-2.5" />
      {t("components.layout.smart_parent")}
    </span>;
}
function ThemeToggleRow({
  onToggle
}: {
  onToggle?: () => void;
}) {
  const {
    mode,
    toggleTheme
  } = useTheme();
  const {
    t
  } = useTranslation();
  const isDark = mode === "dark";
  return <button type="button" onClick={() => {
    toggleTheme();
    onToggle?.();
  }} data-testid="button-theme-toggle" className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
      <span className="flex items-center gap-3">
        {isDark ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
        <span>{isDark ? t("nav.dark_mode") : t("nav.light_mode")}</span>
      </span>
      <span className={`relative h-6 w-11 rounded-full border transition-colors ${isDark ? "bg-primary border-border" : "bg-muted border-border"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-transform ${isDark ? "translate-x-5 bg-primary" : "translate-x-0.5 bg-primary"}`} />
      </span>
    </button>;
}
type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  badge?: string;
};
const NAV_ITEMS: NavItem[] = [{
  href: "/dashboard",
  labelKey: "nav.dashboard",
  icon: Home
}, {
  href: "/parenting-hub",
  labelKey: "nav.parenting_hub",
  icon: BookOpen
}, {
  href: "/amy-coach",
  labelKey: "nav.amy_coach",
  icon: Brain
}, {
  href: "/kids-control-center",
  labelKey: "nav.kids_control_center",
  icon: Baby,
  badge: "Soon 🚀"
}, {
  href: "/children",
  labelKey: "nav.children",
  icon: Users
}, {
  href: "/routines",
  labelKey: "nav.routines",
  icon: Calendar
}, {
  href: "/progress",
  labelKey: "nav.progress",
  icon: TrendingUp
}, {
  href: "/insights",
  labelKey: "nav.insights",
  icon: BarChart2
}, {
  href: "/rewards",
  labelKey: "nav.rewards",
  icon: Trophy
}, {
  href: "/behavior",
  labelKey: "nav.behavior",
  icon: Star
}, {
  href: "/assistant",
  labelKey: "nav.amy_ai",
  icon: Bot
}, {
  href: "/games",
  labelKey: "nav.games",
  icon: Gamepad2
}, {
  href: "/recipes",
  labelKey: "nav.my_recipes",
  icon: ChefHat
}, {
  href: "/nutrition",
  labelKey: "nav.nutrition_hub",
  icon: Salad
}, {
  href: "/parent-profile",
  labelKey: "nav.profile",
  icon: UserCircle
}, {
  href: "/pricing",
  labelKey: "nav.pricing",
  icon: Sparkles
}, {
  href: "/referrals",
  labelKey: "nav.referrals",
  icon: Gift
}, {
  href: "/environment",
  labelKey: "nav.environment",
  icon: Wind
}, {
  href: "/feedback",
  labelKey: "nav.feedback",
  icon: MessageSquarePlus
}];
const BOTTOM_NAV_ITEMS = [{
  href: "/dashboard",
  labelKey: "nav.dashboard",
  icon: Home,
  center: false
}, {
  href: "/routines",
  labelKey: "nav.routines",
  icon: Calendar,
  center: false
}, {
  href: "/amy-coach",
  labelKey: "nav.amy_coach",
  icon: Brain,
  center: true
}, {
  href: "/parenting-hub",
  labelKey: "nav.parenting_hub",
  icon: BookOpen,
  center: false
}];
export function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const {
    signOut
  } = useClerk();
  const {
    user
  } = useUser();
  const {
    t
  } = useTranslation();
  const {
    isPremium
  } = useSubscription();
  usePushRegistration();
  useCapacitorPushRegistrationSync();
  const displayName = getUserDisplayName(user);
  const email = getUserEmail(user);
  const initials = getUserInitials(user);
  const avatarUrl = getUserAvatarUrl(user);

  useEffect(() => {
    logNavEvent("layout-mounted", { location });
  }, [location]);

  const handleSignOut = () => {
    try {
      void signOut({ redirectUrl: "/" });
    } catch (err) {
      console.error("[amynest:nav] sign-out failed", err);
    }
  };
  return <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      {/* Mobile Header — fixed so it never duplicates on Android Chrome */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-20 w-full items-center justify-between border-b bg-background px-4 md:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <BrandLogo size="sm" showTagline={true} />
          <AmyMascotLogo size={34} />
        </div>
        <div className="flex items-center gap-2">
          <LayoutMobileMenu />
        </div>
      </header>

      {/* Spacer pushes content below the fixed mobile header */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r bg-card md:flex">
          <div className="flex h-24 items-center justify-between border-b px-5 shadow-sm">
            <BrandLogo size="md" showTagline={true} />
            <AmyMascotLogo size={42} />
          </div>
          <div className="px-4 pt-3">
            </div>
          <nav className="flex flex-1 flex-col gap-1 p-4">
            {NAV_ITEMS.map(item => {
            const isActive = safePathStartsWith(location, item.href);
            return <Link key={item.href} href={item.href} data-tour={item.href === "/dashboard" ? "dashboard" : item.href === "/routines" ? "routines" : item.href === "/amy-coach" ? "amy-coach" : item.href === "/parenting-hub" ? "parenting-hub" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  {item.badge && <span className="shrink-0 inline-flex items-center rounded-full bg-gradient-to-r from-primary to-primary px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                      {item.badge}
                    </span>}
                </Link>;
          })}
            <div className="mt-2 pt-2 border-t">
              <ThemeToggleRow />
            </div>
          </nav>
          {/* Desktop user / sign-out */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate flex items-center gap-1.5">
                  <span className="truncate">{displayName}</span>
                  {isPremium ? <SmartParentBadge /> : null}
                </span>
                {email ? (
                  <span className="text-xs text-muted-foreground truncate">{email}</span>
                ) : null}
              </div>
            </div>
            <button onClick={handleSignOut} data-testid="button-sign-out" className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" />
              {t("nav.sign_out")}
            </button>
            <p className="text-center text-[9px] font-bold tracking-widest uppercase mt-3 text-primary/25">
              {t("patent_pending.footer_label")}
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-5xl p-4 md:p-8">
            {!["/sign-in", "/onboarding", "/notify-prompt"].some(p => safePathStartsWith(location, p)) && <div className="mb-4">
                <NotificationNudgeBanner />
              </div>}
            {children}
          </div>
        </main>
      </div>

      {/* Notification enable prompt — shown as a bottom-sheet modal ~1.8s
          after the user opens the app if permission has not been granted yet.
          Snoozes for 3 days on dismiss. Banner above handles denied/reconnect. */}
      {!["/sign-in", "/onboarding"].some(p => safePathStartsWith(location, p)) && (
        <NotificationPromptModal />
      )}

      {/* Mobile Bottom Nav — premium 4-tab with center-raised Amy Coach.
          data-on-dark: this nav is intentionally a dark slate surface in
          BOTH themes (matches native iOS/Android tab bar conventions),
          so the legacy-color safety net in index.css must NOT rewrite
          the white text / white borders inside it on light mode. */}
      <nav data-on-dark className="fixed bottom-0 left-0 right-0 z-40 h-[78px] bg-card backdrop-blur-xl border-t border-white/10 md:hidden pb-safe">
        <div className="relative flex h-full w-full items-end justify-around px-2 pb-2">
          {BOTTOM_NAV_ITEMS.map(item => {
          const isActive = safePathStartsWithSegment(location, item.href);
          if (item.center) {
            return <Link key={item.href} href={item.href} data-tour="amy-coach" className="relative flex flex-col items-center justify-end -translate-y-5">
                  <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-full text-white transition-transform active:scale-90 ${isActive ? "bg-gradient-to-br from-primary to-primary shadow-[0_10px_25px_rgba(99,102,241,0.55)] ring-2 ring-white/20" : "bg-gradient-to-br from-primary to-primary shadow-[0_8px_20px_rgba(99,102,241,0.45)]"}`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <span className={`mt-1 text-[10px] font-semibold ${isActive ? "text-muted-foreground" : "text-muted-foreground"}`}>
                    {t(item.labelKey)}
                  </span>
                </Link>;
          }
          return <Link key={item.href} href={item.href} data-tour={item.href === "/dashboard" ? "dashboard" : item.href === "/routines" ? "routines" : item.href === "/parenting-hub" ? "parenting-hub" : undefined} className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <item.icon className={`h-5 w-5 ${isActive ? "fill-primary" : ""}`} />
                <span className="text-[11px] font-medium leading-none">{t(item.labelKey)}</span>
                {isActive && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-muted" />}
              </Link>;
        })}
        </div>
      </nav>

      {/* Floating Amy AI assistant button */}
      <AmyFab />

      {/* Premium spotlight onboarding tour — auto-shows once after first login */}
      <SpotlightTour />
    </div>;
}