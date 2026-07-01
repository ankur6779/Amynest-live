import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppLink } from "@/components/app-link";
import {
  getNavPremiumId,
  NAV_PREMIUM_VISUALS,
} from "@/lib/nav-premium-config";
import { cn } from "@/lib/utils";

type PremiumNavItemProps = {
  href: string;
  label: string;
  description?: string;
  badge?: string;
  isActive?: boolean;
  variant?: "default" | "sign-out";
  onNavigate?: () => void;
  tourId?: string;
  testId?: string;
};

/** Glass navigation row — desktop sidebar & mobile drawer. */
export function PremiumNavItem({
  href,
  label,
  description,
  badge,
  isActive = false,
  variant = "default",
  onNavigate,
  tourId,
  testId,
}: PremiumNavItemProps) {
  const premiumId = getNavPremiumId(href) ?? (variant === "sign-out" ? "sign-out" : undefined);
  const visual = premiumId ? NAV_PREMIUM_VISUALS[premiumId] : undefined;
  const isSignOut = variant === "sign-out";

  const inner = (
    <>
      <div className="relative shrink-0">
        <div
          aria-hidden
          className={cn(
            "absolute -inset-0.5 rounded-[14px] blur-sm",
            isActive ? "bg-orange-400/35" : "bg-white/10",
          )}
        />
        <div
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/16",
            "bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md",
          )}
        >
          {visual ? (
            <img
              src={visual.iconSrc}
              alt=""
              aria-hidden
              className="h-7 w-7 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-quicksand text-[13px] font-bold leading-tight text-white">
            {label}
          </p>
          {badge ? (
            <span className="shrink-0 rounded-full border border-white/12 bg-black/30 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white/90">
              {badge.replace(/🚀/g, "").trim() || badge}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 truncate text-[10px] leading-snug text-white/58">{description}</p>
        ) : null}
      </div>

      {!isSignOut ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
      ) : null}
    </>
  );

  const rowClass = cn(
    "group flex w-full items-center gap-2.5 rounded-[18px] border px-2.5 py-2 text-left transition-all duration-300",
    "hover:-translate-y-0.5 hover:scale-[1.01]",
    isSignOut
      ? "border-rose-400/25 bg-gradient-to-r from-rose-500/12 to-pink-500/8 hover:border-rose-300/40 hover:shadow-[0_0_20px_rgba(244,114,182,0.2)]"
      : isActive
        ? "border-orange-300/45 bg-gradient-to-r from-orange-500/55 via-amber-500/45 to-orange-600/40 shadow-[0_0_24px_rgba(249,115,22,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]"
        : "border-white/[0.08] bg-white/[0.04] hover:border-white/18 hover:bg-white/[0.07] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)]",
  );

  if (isSignOut) {
    return (
      <button type="button" data-testid={testId} onClick={onNavigate} className={rowClass}>
        {inner}
      </button>
    );
  }

  return (
    <AppLink
      href={href}
      source="premium-nav"
      data-tour={tourId}
      onClick={onNavigate}
      className={rowClass}
    >
      {inner}
    </AppLink>
  );
}

export function useNavItemDescription(href: string): string | undefined {
  const { t } = useTranslation();
  const id = getNavPremiumId(href);
  if (!id) return undefined;
  const visual = NAV_PREMIUM_VISUALS[id];
  return t(visual.descriptionKey, visual.defaultDescription);
}

export function navTourId(href: string): string | undefined {
  if (href === "/dashboard") return "dashboard";
  if (href === "/routines") return "routines";
  if (href === "/amy-coach") return "amy-coach";
  if (href === "/parenting-hub") return "parenting-hub";
  return undefined;
}
