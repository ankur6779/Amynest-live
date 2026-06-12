import { useCallback, useLayoutEffect, type RefObject } from "react";

export interface UseAutoGrowTextareaOptions {
  /** Maximum height in pixels before internal scroll. */
  maxHeightPx?: number;
  /** Minimum height in pixels. */
  minHeightPx?: number;
}

/**
 * Keeps a textarea height synced to content up to maxHeightPx, then scrolls internally.
 * Preserves cursor position across resizes.
 */
export function useAutoGrowTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  options: UseAutoGrowTextareaOptions = {},
) {
  const maxHeightPx = options.maxHeightPx ?? 120;
  const minHeightPx = options.minHeightPx ?? 40;

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.style.height = "auto";
    const next = Math.min(Math.max(el.scrollHeight, minHeightPx), maxHeightPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeightPx ? "auto" : "hidden";
    try {
      el.setSelectionRange(start, end);
    } catch {
      /* read-only or unsupported */
    }
  }, [maxHeightPx, minHeightPx, ref]);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return syncHeight;
}
