import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Users, Calendar, Star, Menu, LogOut, UserCircle, Baby, Bot, TrendingUp, BookOpen, Brain, Moon, Sun, Sparkles, Gamepad2, Gift, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useClerk, useUser } from "@/lib/firebase-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";
import { AmyFab } from "@/components/amy-fab";
import { AmyIcon } from "@/components/amy-icon";
import { useTheme } from "@/contexts/theme-context";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSubscription } from "@/hooks/use-subscription";

function SmartParentBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`}
      data-testid="badge-smart-parent"
    >
      <Sparkles className="h-2.5 w-2.5" />
      Smart Parent
    </span>
  );
}

function ThemeToggleRow({ onToggle }: { onToggle?: () => void }) {
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={() => { toggleTheme(); onToggle?.(); }}
      data-testid="button-theme-toggle"
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <span className="flex items-center gap-3">
        {isDark
          ? <Moon className="h-5 w-5 text-violet-400" />
          : <Sun className="h-5 w-5 text-amber-500" />}
        <span>{isDark ? t("nav.dark_mode") : t("nav.light_mode")}</span>
      </span>
      <span
        className={`relative h-6 w-11 rounded-full border transition-colors ${
          isDark
            ? "bg-violet-500/40 border-violet-400/50"
            : "bg-slate-200 border-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-transform ${
            isDark ? "translate-x-5 bg-violet-500" : "translate-x-0.5 bg-amber-500"
          }`}
        />
      </span>
    </button>
  );
}

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",           labelKey: "nav.dashboard",           icon: Home },
  { href: "/parenting-hub",       labelKey: "nav.parenting_hub",       icon: BookOpen },
  { href: "/amy-coach",           labelKey: "nav.amy_coach",           icon: Brain },
  { href: "/kids-control-center", labelKey: "nav.kids_control_center", icon: Baby, badge: "Soon 🚀" },
  { href: "/children",            labelKey: "nav.children",            icon: Users },
  { href: "/routines",            labelKey: "nav.routines",            icon: Calendar },
  { href: "/progress",            labelKey: "nav.progress",            icon: TrendingUp },
  { href: "/behavior",            labelKey: "nav.behavior",            icon: Star },
  { href: "/assistant",           labelKey: "nav.amy_ai",              icon: Bot },
  { href: "/games",               labelKey: "nav.games",               icon: Gamepad2 },
  { href: "/recipes",             labelKey: "nav.my_recipes",          icon: ChefHat },
  { href: "/parent-profile",      labelKey: "nav.profile",             icon: UserCircle },
  { href: "/pricing",             labelKey: "nav.pricing",             icon: Sparkles },
  { href: "/referrals",           labelKey: "nav.referrals",           icon: Gift },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard",     labelKey: "nav.dashboard",     icon: Home,     center: false },
  { href: "/routines",      labelKey: "nav.routines",      icon: Calendar, center: false },
  { href: "/amy-coach",     labelKey: "nav.amy_coach",     icon: Brain,    center: true  },
  { href: "/parenting-hub", labelKey: "nav.parenting_hub", icon: BookOpen, center: false },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const initials = user
    ? (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? user.emailAddresses?.[0]?.emailAddress?.[0] ?? "U")
    : "U";

  const handleSignOut = () => {
    setIsSidebarOpen(false);
    signOut({ redirectUrl: "/" });
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      {/* Mobile Header — fixed so it never duplicates on Android Chrome */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-20 w-full items-center justify-between border-b bg-background px-4 md:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <BrandLogo size="sm" showTagline={true} />
          <AmyIcon size={34} bounce ring />
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] sm:w-[350px] flex flex-col p-0">
              {/* User profile — fixed at top */}
              <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.imageUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate flex items-center gap-1.5">
                    <span className="truncate">
                      {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.emailAddresses?.[0]?.emailAddress}
                    </span>
                    {isPremium && <SmartParentBadge />}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress}</span>
                </div>
              </div>

              {/* Nav items — scrollable */}
              <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeSidebar}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 truncate">{t(item.labelKey)}</span>
                      {item.badge && (
                        <span className="shrink-0 inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
                <div className="mt-2 pt-2 border-t">
                  <ThemeToggleRow onToggle={closeSidebar} />
                </div>
              </nav>

              {/* Sign Out — always visible at bottom */}
              <div className="shrink-0 border-t px-4 py-3">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  {t("nav.sign_out")}
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Spacer pushes content below the fixed mobile header */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r bg-card md:flex">
          <div className="flex h-24 items-center justify-between border-b px-5 shadow-sm">
            <BrandLogo size="md" showTagline={true} />
            <AmyIcon size={42} bounce ring />
          </div>
          <div className="px-4 pt-3">
            <LanguageSwitcher />
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-4">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  {item.badge && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="mt-2 pt-2 border-t">
              <ThemeToggleRow />
            </div>
          </nav>
          {/* Desktop user / sign-out */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.imageUrl ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate flex items-center gap-1.5">
                  <span className="truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "My Account"}
                  </span>
                  {isPremium && <SmartParentBadge />}
                </span>
                <span className="text-xs text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress}</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              data-testid="button-sign-out"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {t("nav.sign_out")}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Nav — premium 4-tab with center-raised Amy Coach */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-[78px] bg-slate-900/95 backdrop-blur-xl border-t border-white/10 md:hidden pb-safe">
        <div className="relative flex h-full w-full items-end justify-around px-2 pb-2">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");

            if (item.center) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center justify-end -translate-y-5"
                >
                  <div
                    className={`flex h-[60px] w-[60px] items-center justify-center rounded-full text-white transition-transform active:scale-90 ${
                      isActive
                        ? "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_10px_25px_rgba(99,102,241,0.55)] ring-2 ring-white/20"
                        : "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_8px_20px_rgba(99,102,241,0.45)]"
                    }`}
                  >
                    <item.icon className="h-7 w-7" />
                  </div>
                  <span className={`mt-1 text-[10px] font-semibold ${isActive ? "text-indigo-300" : "text-slate-300"}`}>
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${
                  isActive ? "text-indigo-400" : "text-slate-400"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "fill-indigo-400/15" : ""}`} />
                <span className="text-[11px] font-medium leading-none">{t(item.labelKey)}</span>
                {isActive && (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Amy AI assistant button */}
      <AmyFab />
    </div>
  );
}
