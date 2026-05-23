import { useCallback, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * Pull-to-refresh helper. Returns props you can spread into <RefreshControl />.
 */
export function useAppDataRefresh(): { refreshing: boolean; onRefresh: () => Promise<void> } {
  const refresh = useAppStore((s) => s.refresh);
  const status = useAppStore((s) => s.status);
  const [pulling, setPulling] = useState(false);

  const onRefresh = useCallback(async () => {
    setPulling(true);
    try {
      await refresh();
    } finally {
      setPulling(false);
    }
  }, [refresh]);

  return { refreshing: pulling || status === "refreshing", onRefresh };
}
