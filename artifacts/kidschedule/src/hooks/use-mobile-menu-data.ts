import { useEffect, useMemo, useState } from "react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useMountedRef, useSafeAsync } from "@/hooks/use-safe-async";
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
  const isMounted = useMountedRef();
  const { safeAsync } = useSafeAsync();

  const safeUser = user ?? {};
  const safeChildren = useMemo(() => (children ?? []) as unknown[], [children]);
  const safeMenu = menuData?.length ? menuData : DEFAULT_MOBILE_MENU;

  useEffect(() => {
    const loadMenu = safeAsync(async () => {
      try {
        const data = await getMenuDataWithTimeout();
        if (!isMounted.current) return null;
        setMenuData(data?.length ? data : DEFAULT_MOBILE_MENU);
        return data;
      } catch (err) {
        console.error("[amynest:nav] Menu API failed", err);
        if (isMounted.current) setMenuData(DEFAULT_MOBILE_MENU);
        return null;
      }
    });

    void loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
