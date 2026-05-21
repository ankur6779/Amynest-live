import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useTranslation } from "react-i18next";
import { safePathStartsWith } from "@/lib/safe-route";

/** Footer nav height (h-[78px]) + center tab lift (~20px) + gap above tabs. */
const FAB_BOTTOM = "calc(98px + var(--safe-bottom, 0px) + 16px)";

export function AmyFab() {
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

  return createPortal(
    <div
      data-tour="amy-fab"
      style={{
        position: "fixed",
        bottom: FAB_BOTTOM,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 70,
        pointerEvents: "none",
      }}
    >
      <div className="amy-fade-in" style={{ pointerEvents: "auto" }}>
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
