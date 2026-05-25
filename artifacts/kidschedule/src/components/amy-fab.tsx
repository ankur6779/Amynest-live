import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useTranslation } from "react-i18next";
import { safePathStartsWith } from "@/lib/safe-route";

type AmyFabProps = {
  /** Render inside `.app-footer` (anchored above tab bar). */
  embedded?: boolean;
};

/** Only floating Ask Amy control — portaled to body for Android WebView. */
export function AmyFab({ embedded = false }: AmyFabProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (
    !mounted ||
    safePathStartsWith(location, "/assistant") ||
    safePathStartsWith(location, "/sign-in") ||
    safePathStartsWith(location, "/sign-up")
  ) {
    return null;
  }

  const fab = (
    <div
      id="amy-fab-floating"
      data-tour="amy-fab"
      data-amynest-fab="active"
      className={embedded ? "amy-fab-floating amy-fab-in-footer" : "amy-fab-floating"}
    >
      <div className="amy-fade-in">
        <Link
          href="/assistant"
          aria-label={t("components.amy_fab.ask_amy_ai")}
          className="group relative flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none"
        >
          <AmyMascotLogo size={58} />
          <span className="absolute -top-2 -right-1 bg-white text-[9px] font-black text-primary dark:text-muted-foreground px-1.5 py-0.5 rounded-full shadow border border-border dark:border-border pointer-events-none">
            {t("components.amy_fab.amy_ai")}
          </span>
        </Link>
      </div>
    </div>
  );

  if (embedded) return fab;
  return createPortal(fab, document.body);
}
