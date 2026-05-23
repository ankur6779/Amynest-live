import { useCallback, useRef, useState } from "react";
import { useInFlightGuard } from "@/hooks/use-safe-async";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { MenuFallbackUi } from "@/components/menu-fallback-ui";
import { LayoutMobileMenuSheet } from "@/components/layout-mobile-menu-sheet";
import { useMobileMenuData } from "@/hooks/use-mobile-menu-data";
import { logNavEvent, logNavError } from "@/lib/navigation-log";
import { useLocation } from "wouter";

export function LayoutMobileMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { t } = useTranslation();
  const { safeMenu, safeChildren } = useMobileMenuData();
  const { run: runInFlight } = useInFlightGuard();
  const menuBusyRef = useRef(false);

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

  const handleMenuToggle = useCallback(() => {
    if (menuBusyRef.current) return;
    void runInFlight(async () => {
      menuBusyRef.current = true;
      try {
        logNavEvent("menu-click", { location });
        setIsMenuOpen((open) => !open);
      } catch (err) {
        logNavError("hamburger-click", err, { location });
      } finally {
        menuBusyRef.current = false;
      }
    });
  }, [location, runInFlight]);

  return (
    <AppErrorBoundary label="MobileMenu" fallback={<MenuFallbackUi />}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden h-10 w-10 min-h-10 min-w-10"
        data-testid="button-mobile-menu"
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
        onClick={handleMenuToggle}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">{t("components.layout.toggle_menu")}</span>
      </Button>

      <LayoutMobileMenuSheet
        isMenuOpen={isMenuOpen}
        onOpenChange={handleOpenChange}
        navItems={safeMenu}
        childList={safeChildren}
      />
    </AppErrorBoundary>
  );
}
