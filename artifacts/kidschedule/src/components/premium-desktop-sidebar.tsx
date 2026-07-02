import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumNavItem, navTourId, useNavItemDescription } from "@/components/premium-nav-item";
import {
  NAV_PREMIUM_HEADER,
  NAV_PREMIUM_VISUALS,
  splitNavItems,
} from "@/lib/nav-premium-config";
import { NAV_ITEMS, type MobileNavItem } from "@/lib/mobile-menu-config";
import { safePathStartsWith } from "@/lib/safe-route";
import { cn } from "@/lib/utils";

type PremiumDesktopSidebarProps = {
  displayName: string;
  email?: string | null;
  initials: string;
  avatarUrl?: string | null;
  isPremium: boolean;
  onSignOut: () => void;
};

function NavItemRow({
  item,
  location,
}: {
  item: MobileNavItem;
  location: string;
}) {
  const { t } = useTranslation();
  const description = useNavItemDescription(item.href);
  const isActive = safePathStartsWith(location, item.href);

  return (
    <PremiumNavItem
      href={item.href}
      label={t(item.labelKey)}
      description={description}
      badge={item.badge}
      isActive={isActive}
      tourId={navTourId(item.href)}
    />
  );
}

function FreeUserBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/65",
        className,
      )}
      data-testid="badge-free-user"
    >
      {t("components.layout.free_user")}
    </span>
  );
}

function SmartParentBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-gradient-to-r from-amber-500/30 to-yellow-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100",
        className,
      )}
      data-testid="badge-smart-parent"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {t("components.layout.smart_parent")}
    </span>
  );
}

/** Premium glass desktop sidebar — matches Parent Hub visual language. */
export function PremiumDesktopSidebar({
  displayName,
  email,
  initials,
  avatarUrl,
  isPremium,
  onSignOut,
}: PremiumDesktopSidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { primary, account } = splitNavItems(NAV_ITEMS);

  return (
    <aside
      className={cn(
        "hidden w-[280px] shrink-0 flex-col border-r border-white/[0.06] md:flex",
        "bg-gradient-to-b from-[#0f1228] via-[#12152f] to-[#0c0e22]",
      )}
    >
      {/* Brand header */}
      <div className="relative overflow-hidden border-b border-white/[0.06] px-4 pb-3 pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 20% 30%, rgba(168,85,247,0.22), transparent 60%), radial-gradient(ellipse 60% 80% at 90% 20%, rgba(244,114,182,0.15), transparent 55%)",
          }}
        />
        <div className="relative flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="font-quicksand text-lg font-black tracking-tight text-white">AmyNest AI</p>
            <p className="text-[11px] leading-snug text-white/55">
              {t("nav.premium_tagline", "AI for Smart Parenting")}
            </p>
          </div>
          <img
            src={NAV_PREMIUM_HEADER.heroSrc}
            alt=""
            aria-hidden
            className="relative h-[60px] w-[60px] object-contain object-center drop-shadow-[0_4px_16px_rgba(168,85,247,0.4)]"
            loading="lazy"
          />
        </div>
      </div>

      {/* Primary navigation */}
      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3 scrollbar-thin">
        {primary.map((item) => (
          <NavItemRow key={item.href} item={item} location={location} />
        ))}
      </nav>

      {/* Account panel */}
      <div className="relative border-t border-white/[0.06] px-3 py-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 100%, rgba(99,102,241,0.18), transparent 70%)",
          }}
        />

        <div className="relative mb-3 flex items-center gap-2.5 rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-2.5 backdrop-blur-md">
          <div className="relative">
            <div aria-hidden className="absolute -inset-1 rounded-full bg-purple-500/30 blur-md" />
            <Avatar className="relative h-10 w-10 border border-white/20">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-white">
              {t("nav.greeting", { name: displayName, defaultValue: "Hi, {{name}}!" })}
            </p>
            {isPremium ? <SmartParentBadge className="mt-1" /> : <FreeUserBadge className="mt-1" />}
            {email ? (
              <p className="mt-0.5 truncate text-[10px] text-white/45">{email}</p>
            ) : null}
          </div>
        </div>

        <div className="relative flex flex-col gap-1.5">
          {account.map((item) => (
            <NavItemRow key={item.href} item={item} location={location} />
          ))}
          <PremiumNavItem
            href="#sign-out"
            label={t("nav.sign_out")}
            description={t(
              NAV_PREMIUM_VISUALS["sign-out"].descriptionKey,
              NAV_PREMIUM_VISUALS["sign-out"].defaultDescription,
            )}
            variant="sign-out"
            testId="button-sign-out"
            onNavigate={onSignOut}
          />
        </div>

        <img
          src={NAV_PREMIUM_HEADER.profileHeroSrc}
          alt=""
          aria-hidden
          className="relative mx-auto mt-3 h-[88px] w-full max-w-[220px] object-contain object-bottom opacity-95"
          loading="lazy"
        />

        <p className="relative mt-2 text-center text-[8px] font-bold uppercase tracking-widest text-white/20">
          {t("patent_pending.footer_label")}
        </p>
      </div>
    </aside>
  );
}
