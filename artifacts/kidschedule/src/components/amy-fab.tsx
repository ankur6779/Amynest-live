import { useCallback, useEffect, useState, type CSSProperties } from "react";
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

/** Only floating Ask Amy control — portaled to body for Android WebView. */
export function AmyFab() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [bottom, setBottom] = useState("100px");

  const updateFabPosition = useCallback(() => {
    const footer = document.querySelector(".app-footer") as HTMLElement | null;

    if (!footer) {
      setBottom("100px");
      return;
    }

    const height = footer.offsetHeight;
    console.log("Footer height:", height);
    setBottom(`${height + 20}px`);
  }, []);

  const scheduleFabPosition = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(updateFabPosition);
    });
  }, [updateFabPosition]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    scheduleFabPosition();
    updateFabPosition();

    window.addEventListener("resize", updateFabPosition);
    window.addEventListener("load", updateFabPosition);

    const t = window.setTimeout(updateFabPosition, 300);

    return () => {
      window.removeEventListener("resize", updateFabPosition);
      window.removeEventListener("load", updateFabPosition);
      window.clearTimeout(t);
    };
  }, [mounted, location, scheduleFabPosition, updateFabPosition]);

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
