import { useMemo } from "react";
import { useListChildren } from "@workspace/api-client-react";

type ChildRow = { id: number; name: string; createdAt?: string };

/** First child by createdAt — matches server free-tier child gate ordering. */
export function usePrimaryChild(): { childName: string | null; childId: number | null } {
  const { data } = useListChildren();
  return useMemo(() => {
    const rows = (data ?? []) as ChildRow[];
    if (rows.length === 0) return { childName: null, childId: null };
    const sorted = [...rows].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb || a.id - b.id;
    });
    const first = sorted[0];
    return { childName: first.name?.trim() || null, childId: first.id };
  }, [data]);
}
