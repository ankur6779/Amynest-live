import { useCallback, useEffect, useState } from "react";
import {
  APP_HEADER_HEIGHT_CSS_VAR,
  APP_HEADER_HEIGHT_FALLBACK_PX,
} from "@/lib/app-layout";

/**
 * Measures the mobile app header and writes `--app-header-height` on :root so
 * ScreenContainer / CSS can offset scrollable content below a fixed header.
 */
export function useAppHeaderHeight(enabled: boolean) {
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);

  const headerRef = useCallback((node: HTMLElement | null) => {
    setHeaderEl(node);
  }, []);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.style.removeProperty(APP_HEADER_HEIGHT_CSS_VAR);
      return;
    }

    document.documentElement.style.setProperty(
      APP_HEADER_HEIGHT_CSS_VAR,
      `${APP_HEADER_HEIGHT_FALLBACK_PX}px`,
    );

    if (!headerEl) return;

    const apply = () => {
      const height = Math.ceil(headerEl.getBoundingClientRect().height);
      if (height > 0) {
        document.documentElement.style.setProperty(
          APP_HEADER_HEIGHT_CSS_VAR,
          `${height}px`,
        );
      }
    };

    apply();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        document.documentElement.style.removeProperty(APP_HEADER_HEIGHT_CSS_VAR);
      };
    }

    const observer = new ResizeObserver(apply);
    observer.observe(headerEl);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(APP_HEADER_HEIGHT_CSS_VAR);
    };
  }, [enabled, headerEl]);

  return headerRef;
}
