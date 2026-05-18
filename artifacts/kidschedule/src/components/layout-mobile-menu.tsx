import { lazy, Suspense, useCallback, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { MenuFallbackUi } from "@/components/menu-fallback-ui";
import { logNavEvent, logNavError } from "@/lib/navigation-log";
import { useLocation } from "wouter";

// Lazy-load sheet (Radix + nav hooks) so hamburger tap stays light on mobile PWA.
const LayoutMobileMenuSheet = lazy(() =>
  import("@/components/layout-mobile-menu-sheet").then((m) => ({
    default: m.LayoutMobileMenuSheet,
  })),
);

function MenuLoadingHint() {
  return (
    <div className="text-xs text-muted-foreground px-2" aria-live="polite">
      Menu loading…
    </div>
  );
}

export function LayoutMobileMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { t } = useTranslation();

  // Fix: always sync Radix controlled `open` — never block on auth load (was crashing PWA).
  const handleOpenChange = useCallback(
    (open: boolean) => {
      try {
        logNavEvent(open ? "menu-open" : "menu-close", { location });
        setIsMenuOpen(open);
      } catch (err) {
        logNavError("menu-open-change", err, { open, location });
      }
    },
    [location],
  );

  const handleHamburgerClick = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        console.log("[amynest:nav] Hamburger clicked", { location });
      }
      logNavEvent("menu-click", { location });
      setIsMenuOpen(true);
    } catch (err) {
      logNavError("hamburger-click", err, { location });
    }
  }, [location]);

  return (
    <AppErrorBoundary label="MobileMenu" fallback={<MenuFallbackUi />}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        data-testid="button-mobile-menu"
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
        onClick={handleHamburgerClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">{t("components.layout.toggle_menu")}</span>
      </Button>

      {isMenuOpen ? (
        <Suspense fallback={<MenuLoadingHint />}>
          <LayoutMobileMenuSheet isMenuOpen={isMenuOpen} onOpenChange={handleOpenChange} />
        </Suspense>
      ) : null}
    </AppErrorBoundary>
  );
}
