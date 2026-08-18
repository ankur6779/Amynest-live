import { Settings2, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLink } from "@/components/app-link";
import { AmyAIIcon } from "@/components/ask-amy/amy-ai-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LIVING_NAV_BRAND,
  LIVING_NAV_HOME_LINE,
  type LivingNavRow,
  type LivingNavSection,
} from "@/lib/nav-living-ia";
import { safePathStartsWith } from "@/lib/safe-route";
import { cn } from "@/lib/utils";
import { prefetchRouteChunk } from "@/lib/route-chunk-preload";
import "@/components/nav/amynest-home-nav.css";

export function isHomeNavRowActive(location: string, href: string): boolean {
  const [path, hash] = href.split("#");
  if (!path || !safePathStartsWith(location, path)) return false;
  if (!hash) {
    if (path === "/parenting-hub") {
      const current =
        typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      return !current;
    }
    return true;
  }
  const current = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  return current === hash;
}

export function homeNavRowTestId(href: string): string {
  return `home-nav${href.replace(/[/#]/g, "-")}`;
}

function applyNavHash(href: string) {
  const hash = href.split("#")[1];
  if (!hash || typeof window === "undefined") return;
  window.setTimeout(() => {
    if (window.location.hash !== `#${hash}`) {
      window.location.hash = hash;
    } else {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }, 0);
}

export function HomeNavHeader({
  onClose,
}: {
  onClose?: () => void;
}) {
  return (
    <div className="amynest-home-nav-header">
      <div className="amynest-home-nav-brand">
        <p className="ahn-brand-name">{LIVING_NAV_BRAND}</p>
        <p className="ahn-brand-line">{LIVING_NAV_HOME_LINE}</p>
      </div>
      {onClose ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="amynest-home-nav-close"
        >
          <X className="mx-auto h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}

export function HomeNavFamilyRow({
  displayName,
  childName,
  extraChildren,
  initials,
  avatarUrl,
  onNavigate,
  testId = "drawer-profile-card",
}: {
  displayName: string;
  childName?: string;
  extraChildren: number;
  initials: string;
  avatarUrl?: string | null;
  onNavigate?: () => void;
  testId?: string;
}) {
  const withLine = childName
    ? extraChildren > 0
      ? `With ${childName} +${extraChildren}`
      : `With ${childName}`
    : undefined;

  return (
    <AppLink
      href="/parent-profile"
      source="drawer-profile"
      onClick={onNavigate}
      className="amynest-home-nav-family"
      data-testid={testId}
    >
      <Avatar className="h-9 w-9 shrink-0 border border-[rgba(232,212,184,0.22)]">
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback className="bg-[rgba(232,212,184,0.14)] text-xs font-semibold text-[rgba(243,232,216,0.96)]">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="ahn-copy">
        <p>Hi, {displayName}</p>
        {withLine ? <p>{withLine}</p> : <p>Account</p>}
      </div>
      <Settings2 className="h-4 w-4 shrink-0 text-[rgba(184,169,154,0.88)]" aria-hidden />
    </AppLink>
  );
}

function RowMark({
  mark,
  icon: Icon,
}: {
  mark?: LivingNavRow["mark"];
  icon: LucideIcon;
}) {
  if (mark === "amy-ai") {
    return (
      <span className="ahn-mark" aria-hidden>
        <AmyAIIcon size={22} />
      </span>
    );
  }
  return (
    <span className="ahn-mark" aria-hidden>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  );
}

export function HomeNavRow({
  row,
  location,
  onNavigate,
}: {
  row: LivingNavRow;
  location: string;
  onNavigate?: () => void;
}) {
  const active = isHomeNavRowActive(location, row.href);
  const handleClick = () => {
    onNavigate?.();
    applyNavHash(row.href);
  };

  return (
    <div onPointerDown={() => prefetchRouteChunk(row.href.split("#")[0] ?? row.href)}>
      <AppLink
        href={row.href}
        source="drawer-nav"
        onClick={handleClick}
        className={cn(
          "amynest-home-nav-row",
          row.emphasis === "primary" && "amynest-home-nav-row--primary",
          row.emphasis === "quiet" && "amynest-home-nav-row--quiet",
          active && "amynest-home-nav-row--active",
        )}
        aria-current={active ? "page" : undefined}
        data-testid={homeNavRowTestId(row.href)}
      >
        <RowMark mark={row.mark} icon={row.icon} />
        <span className="ahn-copy">
          <span className="ahn-label">{row.label}</span>
          {row.description ? <span className="ahn-desc">{row.description}</span> : null}
        </span>
      </AppLink>
    </div>
  );
}

function HomeNavMoreSection({
  section,
  location,
  onNavigate,
}: {
  section: LivingNavSection;
  location: string;
  onNavigate?: () => void;
}) {
  const autoOpen = section.items.some((row) => isHomeNavRowActive(location, row.href));
  const [open, setOpen] = useState(autoOpen);
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <details
      className="amynest-home-nav-more"
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="amynest-home-nav-heading amynest-home-nav-more-summary">
        {section.label ?? "More"}
      </summary>
      <div className="flex flex-col">
        {section.items.map((row) => (
          <HomeNavRow
            key={row.href}
            row={row}
            location={location}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </details>
  );
}

export function HomeNavSections({
  sections,
  location,
  onNavigate,
}: {
  sections: LivingNavSection[];
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="amynest-home-nav-scroll" aria-label="AmyNest home">
      {sections.map((section) => (
        <section key={section.id} className="amynest-home-nav-section" data-nav-section={section.id}>
          {section.label && section.id !== "more" ? (
            section.id === "rooms" ? (
              <AppLink
                href="/parenting-hub"
                source="drawer-nav"
                onClick={() => {
                  onNavigate?.();
                  if (typeof window !== "undefined") window.location.hash = "";
                }}
                className="amynest-home-nav-heading block"
              >
                {section.label}
              </AppLink>
            ) : (
              <h2 className="amynest-home-nav-heading">{section.label}</h2>
            )
          ) : null}
          {section.id === "more" ? (
            <HomeNavMoreSection
              section={section}
              location={location}
              onNavigate={onNavigate}
            />
          ) : (
            <div className="flex flex-col">
              {section.items.map((row) => (
                <HomeNavRow
                  key={row.href}
                  row={row}
                  location={location}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </nav>
  );
}

export function HomeNavSignOut({
  onSignOut,
  testId,
}: {
  onSignOut: () => void;
  testId: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="amynest-home-nav-footer">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button type="button" className="amynest-home-nav-signout" data-testid={testId}>
            {t("nav.sign_out", { defaultValue: "Sign Out" })}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent
          className="z-[300] rounded-3xl max-w-sm mx-auto"
          overlayClassName="z-[300]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("nav.sign_out_confirm_title", { defaultValue: "Sign out?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("nav.sign_out_confirm_body", {
                defaultValue:
                  "You can sign back in anytime. Your account and subscription stay with you — this only ends the session on this device.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              {t("nav.sign_out_confirm_cancel", { defaultValue: "Stay signed in" })}
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={onSignOut}>
              {t("nav.sign_out_confirm_action", { defaultValue: "Sign Out" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function homeNavShellClass(className?: string): string {
  return cn("amynest-home-nav flex h-full min-h-0 flex-col overflow-hidden", className);
}
