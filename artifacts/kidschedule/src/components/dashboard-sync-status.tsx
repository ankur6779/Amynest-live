import { useEffect, useMemo, useState } from "react";
import {
  formatDashboardSyncLabel,
  readDashboardSyncTimestamp,
} from "@/lib/dashboard-data-cache";

type Props = {
  /** Latest React Query `dataUpdatedAt` from live dashboard fetches (ms). */
  liveUpdatedAt?: number;
  isRefreshing?: boolean;
};

/**
 * Subtle hydration timestamp — "Last synced just now" / "Updated 2 min ago".
 */
export function DashboardSyncStatus({ liveUpdatedAt = 0, isRefreshing = false }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const label = useMemo(() => {
    const cachedAt = readDashboardSyncTimestamp() ?? 0;
    const syncedAt = Math.max(cachedAt, liveUpdatedAt);
    if (syncedAt <= 0) return null;
    return formatDashboardSyncLabel(syncedAt, now);
  }, [liveUpdatedAt, now]);

  if (!label) {
    if (!isRefreshing) return null;
    return (
      <p className="text-[11px] text-muted-foreground/90 px-0.5" role="status">
        Syncing…
      </p>
    );
  }

  return (
    <p
      className="text-[11px] text-muted-foreground/90 px-0.5"
      role="status"
      aria-live="polite"
    >
      {label}
    </p>
  );
}
