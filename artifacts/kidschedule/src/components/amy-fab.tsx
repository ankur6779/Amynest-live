import { Link, useLocation } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useTranslation } from "react-i18next";
import { safePathStartsWith } from "@/lib/safe-route";
export function AmyFab() {
  const {
    t
  } = useTranslation();
  const [location] = useLocation();
  if (
    safePathStartsWith(location, "/assistant") ||
    safePathStartsWith(location, "/sign-in") ||
    safePathStartsWith(location, "/sign-up")
  ) {
    return null;
  }
  return <div data-tour="amy-fab" className="fixed right-4 z-50 bottom-20 md:bottom-6 amy-fade-in">
      <Link href="/assistant" aria-label={t("components.amy_fab.ask_amy_ai")} className="group relative flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none">
        <AmyMascotLogo size={58} />
        <span className="absolute -top-2 -right-1 bg-white text-[9px] font-black text-primary dark:text-muted-foreground px-1.5 py-0.5 rounded-full shadow border border-border dark:border-border pointer-events-none">
          {t("components.amy_fab.amy_ai")}
        </span>
      </Link>
    </div>;
}