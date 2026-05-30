import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

export function usePaginatedList<T>(
  items: readonly T[],
  pageSize = DEFAULT_PAGE_SIZE,
): {
  visible: T[];
  total: number;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
} {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const visible = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(items.length, count + pageSize));
  }, [items.length, pageSize]);

  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  return {
    visible,
    total: items.length,
    hasMore: visibleCount < items.length,
    loadMore,
    reset,
  };
}
