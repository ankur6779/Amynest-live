import { ChevronRight, type LucideIcon } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { cn } from "@/lib/utils";

export type DrawerTone = "primary" | "learning" | "insights" | "account" | "danger";

type ToneStyle = {
  /** icon glyph color */
  icon: string;
  /** icon container gradient */
  iconWrap: string;
  /** active row gradient (left→right) */
  activeWrap: string;
  /** active row glow shadow */
  glow: string;
  /** animated left accent bar */
  accent: string;
};

const TONES: Record<DrawerTone, ToneStyle> = {
  primary: {
    icon: "text-violet-100",
    iconWrap: "from-violet-500/30 to-fuchsia-500/12",
    activeWrap: "from-violet-500/26 via-fuchsia-500/12",
    glow: "shadow-[0_12px_34px_-14px_rgba(139,92,246,0.65)]",
    accent: "from-violet-300 to-fuchsia-300",
  },
  learning: {
    icon: "text-sky-100",
    iconWrap: "from-sky-500/30 to-cyan-500/12",
    activeWrap: "from-sky-500/26 via-cyan-500/12",
    glow: "shadow-[0_12px_34px_-14px_rgba(56,189,248,0.6)]",
    accent: "from-sky-300 to-cyan-300",
  },
  insights: {
    icon: "text-emerald-100",
    iconWrap: "from-emerald-500/30 to-teal-500/12",
    activeWrap: "from-emerald-500/26 via-teal-500/12",
    glow: "shadow-[0_12px_34px_-14px_rgba(16,185,129,0.55)]",
    accent: "from-emerald-300 to-teal-300",
  },
  account: {
    icon: "text-slate-100",
    iconWrap: "from-slate-300/22 to-slate-500/10",
    activeWrap: "from-slate-300/20 via-slate-400/10",
    glow: "shadow-[0_12px_34px_-14px_rgba(148,163,184,0.5)]",
    accent: "from-slate-200 to-slate-300",
  },
  danger: {
    icon: "text-rose-100",
    iconWrap: "from-rose-500/30 to-pink-500/12",
    activeWrap: "from-rose-500/24 via-pink-500/12",
    glow: "shadow-[0_12px_34px_-14px_rgba(244,114,182,0.55)]",
    accent: "from-rose-300 to-pink-300",
  },
};

type DrawerNavItemProps = {
  href: string;
  label: string;
  description?: string;
  badge?: string;
  icon: LucideIcon;
  tone: DrawerTone;
  isActive?: boolean;
  /** cascade order for the enter animation */
  index?: number;
  variant?: "default" | "sign-out";
  onNavigate?: () => void;
  tourId?: string;
  testId?: string;
};

/** Premium glass navigation row for the mobile command-center drawer. */
export function DrawerNavItem({
  href,
  label,
  description,
  badge,
  icon: Icon,
  tone,
  isActive = false,
  index = 0,
  variant = "default",
  onNavigate,
  tourId,
  testId,
}: DrawerNavItemProps) {
  const isSignOut = variant === "sign-out";
  const t = TONES[isSignOut ? "danger" : tone];

  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b transition-opacity duration-300",
          t.accent,
          isActive ? "opacity-100" : "opacity-0",
        )}
      />

      <span className="relative shrink-0">
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-[16px] bg-gradient-to-br opacity-70 blur-[7px]",
            t.iconWrap,
          )}
        />
        <span
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/14 bg-gradient-to-br",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md",
            t.iconWrap,
          )}
        >
          <Icon className={cn("h-[22px] w-[22px]", t.icon)} strokeWidth={2} aria-hidden />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-quicksand text-[16px] font-semibold leading-tight text-white">
            {label}
          </span>
          {badge ? (
            <span className="shrink-0 rounded-full border border-white/12 bg-black/30 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white/90">
              {badge.replace(/🚀/g, "").trim() || badge}
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="mt-0.5 block truncate text-[13px] leading-snug text-white/50">
            {description}
          </span>
        ) : null}
      </span>

      {!isSignOut ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-white/25" aria-hidden />
      ) : null}
    </>
  );

  const rowClass = cn(
    "group relative flex min-h-[64px] w-full items-center gap-3 overflow-hidden rounded-[22px] border px-3 text-left",
    "transition-all duration-300 ease-out will-change-transform",
    "animate-in fade-in slide-in-from-left-2 fill-mode-both",
    "active:scale-[0.99]",
    isActive
      ? cn("border-white/16 bg-gradient-to-r to-transparent", t.activeWrap, t.glow)
      : isSignOut
        ? "border-rose-400/20 bg-rose-500/[0.06] hover:-translate-y-[1px] hover:border-rose-300/35 hover:bg-rose-500/[0.1] hover:shadow-[0_12px_30px_-16px_rgba(244,114,182,0.5)]"
        : "border-white/[0.06] bg-white/[0.03] hover:-translate-y-[1px] hover:border-white/14 hover:bg-white/[0.06] hover:shadow-[0_12px_30px_-16px_rgba(0,0,0,0.65)]",
  );

  const style = { animationDelay: `${Math.min(index, 16) * 40}ms`, animationDuration: "340ms" };

  if (isSignOut) {
    return (
      <button type="button" data-testid={testId} onClick={onNavigate} className={rowClass} style={style}>
        {inner}
      </button>
    );
  }

  return (
    <AppLink
      href={href}
      source="drawer-nav"
      data-tour={tourId}
      onClick={onNavigate}
      className={rowClass}
      style={style}
    >
      {inner}
    </AppLink>
  );
}
