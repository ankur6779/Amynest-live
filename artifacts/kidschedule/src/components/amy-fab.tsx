import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useTranslation } from "react-i18next";
import { safePathStartsWith } from "@/lib/safe-route";

const FAB_STYLE: CSSProperties = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 9999,
};

function measureFabBottom(): string {
  const footer = document.querySelector("footer.app-footer");
  if (!footer) return "110px";
  const rect = footer.getBoundingClientRect();
  const gap = 12;
  const px = Math.round(window.innerHeight - rect.top + gap);
  return `${Math.max(px, 110)}px`;
}

/** Only floating Ask Amy control — portaled to body for Android WebView. */
export function AmyFab() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [bottom, setBottom] = useState("110px");

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    const update = () => setBottom(measureFabBottom());
    update();
    window.addEventListener("resize", update);
    const retry = window.setTimeout(update, 150);
    return () => {
      window.removeEventListener("resize", update);
      window.clearTimeout(retry);
    };
  }, [mounted, location]);

  if (
    !mounted ||
    safePathStartsWith(location, "/assistant") ||
    safePathStartsWith(location, "/sign-in") ||
    safePathStartsWith(location, "/sign-up")
  ) {
    return null;
  }

  return createPortal(
    <div
      id="amy-fab-floating"
      data-tour="amy-fab"
      data-amynest-fab="active"
      style={{
        ...FAB_STYLE,
        bottom,
      }}
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
    </div>,
    document.body,
  );
}
