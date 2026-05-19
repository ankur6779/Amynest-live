import { useEffect, useMemo, useState } from "react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { useUser } from "@/lib/firebase-auth-hooks";
import {
  DEFAULT_MOBILE_MENU,
  getMenuDataWithTimeout,
  type MobileNavItem,
} from "@/lib/mobile-menu-config";

/** Background menu hydration — never blocks the hamburger UI. */
export function useMobileMenuData() {
  const { user, isLoaded: userLoaded } = useUser();
  const { data: children, isLoading: childrenLoading } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      enabled: userLoaded && !!user,
    },
  });
  const [menuData, setMenuData] = useState<MobileNavItem[]>(DEFAULT_MOBILE_MENU);

  const safeUser = user ?? {};
  const safeChildren = useMemo(() => (children ?? []) as unknown[], [children]);
  const safeMenu = menuData?.length ? menuData : DEFAULT_MOBILE_MENU;

  useEffect(() => {
    console.log("[MENU DATA]", safeUser, safeChildren);
  }, [safeUser, safeChildren]);

  useEffect(() => {
    let isMounted = true;

    const loadMenu = async () => {
      try {
        const data = await getMenuDataWithTimeout();
        if (isMounted) {
          setMenuData(data?.length ? data : DEFAULT_MOBILE_MENU);
        }
      } catch (err) {
        console.error("[amynest:nav] Menu API failed", err);
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

  return {
    menuData,
    safeMenu,
    safeUser,
    safeChildren,
    userLoaded,
    childrenLoading,
  };
}
