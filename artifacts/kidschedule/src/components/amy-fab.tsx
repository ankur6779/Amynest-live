import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { AMY_FAB_ICON_SRC } from "@/lib/amy/amy-stage-assets";
import { useTranslation } from "react-i18next";
import { safePathStartsWith } from "@/lib/safe-route";

type AmyFabProps = {
  /** Render inside `.app-footer` (anchored above tab bar). */
  embedded?: boolean;
};

/** Square-cropped mascot — fills the FAB box without JS layout measurement. */
function AmyFabAvatar() {
  return (
    <div className="amy-fab-avatar amy-mascot-outer" aria-hidden>
      <div className="amy-mascot-float amy-fab-avatar__float">
        <div className="amy-mascot-hover-ring amy-fab-avatar__ring" />
        <div className="amy-mascot-glow amy-fab-avatar__glow">
          <img
            src={AMY_FAB_ICON_SRC}
            alt=""
            draggable={false}
            className="amy-fab-avatar__img"
          />
        </div>
      </div>
    </div>
  );
}

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
          className="group relative flex min-h-14 min-w-14 items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none"
        >
          <AmyFabAvatar />
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
