import { useEffect, useState } from "react";
import {
  DEFAULT_MOBILE_MENU,
  getMenuDataWithTimeout,
  type MobileNavItem,
} from "@/lib/mobile-menu-config";

/** Background menu hydration — never blocks the hamburger UI. */
export function useMobileMenuData() {
  const [menuData, setMenuData] = useState<MobileNavItem[]>(DEFAULT_MOBILE_MENU);

  useEffect(() => {
    let isMounted = true;

    const loadMenu = async () => {
      try {
        const data = await getMenuDataWithTimeout();
        if (isMounted) {
          setMenuData(data?.length ? data : DEFAULT_MOBILE_MENU);
        }
      } catch (err) {
        console.warn("[amynest:nav] Menu fallback triggered:", err);
        if (isMounted) {
          setMenuData(DEFAULT_MOBILE_MENU);
        }
      }
    };

    void loadMenu();

    return () => {
      isMounted = false;
    };
  }, []);

  const safeMenu = menuData?.length ? menuData : DEFAULT_MOBILE_MENU;

  return { menuData, safeMenu };
}
